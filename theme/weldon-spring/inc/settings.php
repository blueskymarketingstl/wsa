<?php
function wsa_setting($name, $default = '') { return get_option('wsa_' . $name, $default); }
function wsa_booking_url() { return wsa_setting('booking_url', 'https://aops.cc/jacobi-car-care-llc-dba-weldon-springs-auto-booking'); }
add_action('admin_menu', function() {
    add_theme_page('Shop Settings', 'Shop Settings', 'manage_options', 'wsa-settings', 'wsa_settings_page');
});
function wsa_settings_page() {
    if (!current_user_can('manage_options')) { return; }
    if (isset($_POST['wsa_save'])) {
        check_admin_referer('wsa_settings');
        $email = sanitize_email(wp_unslash($_POST['inquiry_email'] ?? ''));
        $url = esc_url_raw(wp_unslash($_POST['booking_url'] ?? ''), ['https']);
        if (is_email($email) && $url) {
            update_option('wsa_inquiry_email', $email);
            update_option('wsa_booking_url', $url);
            if (current_user_can('unfiltered_html')) { update_option('wsa_booking_embed', wp_unslash($_POST['booking_embed'] ?? '')); }
            echo '<div class="notice notice-success"><p>Shop settings saved.</p></div>';
        } else { echo '<div class="notice notice-error"><p>Enter a valid inquiry email and an HTTPS booking URL.</p></div>'; }
    }
    ?>
    <div class="wrap"><h1>Weldon Spring Shop Settings</h1><form method="post">
    <?php wp_nonce_field('wsa_settings'); ?>
    <table class="form-table"><tr><th><label for="inquiry-email">Inquiry recipient</label></th><td><input class="regular-text" type="email" required id="inquiry-email" name="inquiry_email" value="<?php echo esc_attr(wsa_setting('inquiry_email', 'michael@blueskymarketingstl.com')); ?>"><p>Configure authenticated email delivery on your host and send a real test before launch.</p></td></tr>
    <tr><th><label for="booking-url">Booking link</label></th><td><input class="large-text" id="booking-url" name="booking_url" type="url" required value="<?php echo esc_attr(wsa_booking_url()); ?>"></td></tr>
    <?php if (current_user_can('unfiltered_html')): ?><tr><th><label for="booking-embed">STEER embed</label></th><td><textarea class="large-text code" rows="9" id="booking-embed" name="booking_embed"><?php echo esc_textarea(wsa_setting('booking_embed')); ?></textarea><p>Paste only the trusted embed supplied by STEER. It will run on the booking page. Leave empty to use the booking link.</p></td></tr><?php endif; ?>
    </table><button class="button button-primary" name="wsa_save" value="1">Save shop settings</button></form></div>
    <?php
}
