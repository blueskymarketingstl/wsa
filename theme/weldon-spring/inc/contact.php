<?php
add_action('admin_post_nopriv_wsa_inquiry', 'wsa_handle_inquiry');
add_action('admin_post_wsa_inquiry', 'wsa_handle_inquiry');
function wsa_contact_redirect($status) {
    wp_safe_redirect(add_query_arg('inquiry', $status, home_url('/contact/')) . '#inquiry-result', 303); exit;
}
function wsa_handle_inquiry() {
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') { wsa_contact_redirect('invalid'); }
    if (!isset($_POST['wsa_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['wsa_nonce'])), 'wsa_inquiry')) { wsa_contact_redirect('expired'); }
    if (!empty($_POST['website'])) { wsa_contact_redirect('invalid'); }
    $data = [];
    foreach (['name', 'email', 'phone', 'vehicle', 'message', 'consent'] as $field) {
        if (isset($_POST[$field]) && !is_string($_POST[$field])) { wsa_contact_redirect('invalid'); }
        $data[$field] = wp_unslash($_POST[$field] ?? '');
    }
    $name = sanitize_text_field($data['name']); $email = sanitize_email($data['email']);
    $phone = sanitize_text_field($data['phone']); $vehicle = sanitize_text_field($data['vehicle']);
    $message = sanitize_textarea_field($data['message']);
    if (!$name || strlen($name) > 120 || !is_email($email) || strlen($email) > 254 || strlen($phone) > 40 || strlen($vehicle) > 160 || strlen($message) < 10 || strlen($message) > 5000 || $data['consent'] !== '1') { wsa_contact_redirect('invalid'); }
    $key = 'wsa_inquiry_' . hash_hmac('sha256', $_SERVER['REMOTE_ADDR'] ?? 'unknown', wp_salt());
    if (get_transient($key)) { wsa_contact_redirect('limited'); }
    set_transient($key, 1, 60);
    $recipient = wsa_setting('inquiry_email', 'michael@blueskymarketingstl.com');
    $body = "Website inquiry\n\nName: $name\nEmail: $email\nPhone: $phone\nVehicle: $vehicle\n\n$message\n\nThis is an inquiry, not a confirmed appointment.";
    $sent = wp_mail($recipient, 'Weldon Spring website inquiry', $body, ['Reply-To: ' . $email]);
    if (!$sent) { delete_transient($key); }
    wsa_contact_redirect($sent ? 'sent' : 'failed');
}
function wsa_contact_form() {
    $messages = ['sent' => 'Thanks for reaching out! Your inquiry was submitted. Our team will follow up during business hours. This does not confirm an appointment.', 'failed' => 'Your message could not be submitted. Please call (636) 498-6600 so we can help.', 'invalid' => 'Please check your details, enter a message of at least 10 characters, and agree to the privacy policy.', 'expired' => 'This form has expired. Refresh this page and try again.', 'limited' => 'Please wait a minute before sending another inquiry. For help now, call (636) 498-6600.'];
    $status = isset($_GET['inquiry']) && is_string($_GET['inquiry']) ? sanitize_key($_GET['inquiry']) : '';
    if (isset($messages[$status])) { echo '<div id="inquiry-result" class="form-notice" role="status" tabindex="-1">' . esc_html($messages[$status]) . '</div>'; }
    ?>
    <form class="inquiry-form" method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>">
        <input type="hidden" name="action" value="wsa_inquiry"><?php wp_nonce_field('wsa_inquiry', 'wsa_nonce'); ?>
        <div class="form-grid"><label>Your name <span>*</span><input name="name" autocomplete="name" maxlength="120" required></label><label>Email address <span>*</span><input type="email" name="email" autocomplete="email" maxlength="254" required></label>
        <label>Phone number<input type="tel" name="phone" autocomplete="tel" maxlength="40"></label><label>Vehicle <span class="optional">(optional)</span><input name="vehicle" placeholder="Year, make, and model" maxlength="160"></label></div>
        <label>How can we help? <span>*</span><textarea name="message" rows="5" minlength="10" maxlength="5000" required placeholder="Tell us what’s going on with your vehicle."></textarea></label>
        <div class="honeypot" aria-hidden="true"><label>Leave this empty<input name="website" tabindex="-1" autocomplete="off"></label></div>
        <label class="consent"><input type="checkbox" name="consent" value="1" required><span>I agree to the <a href="<?php echo esc_url(wsa_url('privacy/')); ?>">privacy policy</a> and may be contacted about this inquiry.</span></label>
        <button class="button" type="submit">Send your message <?php echo wsa_icon('arrow'); ?></button>
        <p class="form-help">An inquiry is not an appointment confirmation. Please don’t include payment details or sensitive information.</p>
    </form>
    <?php
}
