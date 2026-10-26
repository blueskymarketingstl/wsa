<?php
/** Initial page content. Published pages remain editable in WordPress. */
function wsa_page_definitions() {
    return json_decode(file_get_contents(__DIR__ . '/pages.json'), true);
}
function wsa_seed_pages() {
    $ids = [];
    foreach (wsa_page_definitions() as $slug => $page) {
        $path = !empty($page['parent']) ? $page['parent'] . '/' . $slug : $slug;
        $existing = get_page_by_path($path);
        if ($existing) { $ids[$slug] = $existing->ID; continue; }
        $parent = !empty($page['parent']) ? ($ids[$page['parent']] ?? 0) : 0;
        $id = wp_insert_post([
            'post_type' => 'page', 'post_status' => 'publish', 'post_name' => $slug,
            'post_title' => $page['title'], 'post_content' => $page['content'],
            'post_excerpt' => $page['description'], 'post_parent' => $parent,
        ], true);
        if (!is_wp_error($id)) {
            $ids[$slug] = $id;
            update_post_meta($id, '_wsa_image', $page['image'] ?? 'trust.webp');
            update_post_meta($id, '_wsa_eyebrow', $page['eyebrow'] ?? 'Your neighborhood auto experts');
            update_post_meta($id, '_wsa_service', !empty($page['parent']) ? '1' : '0');
        }
    }
    if (!empty($ids['home'])) {
        update_option('show_on_front', 'page');
        update_option('page_on_front', $ids['home']);
    }
    update_option('blogname', 'Weldon Spring Automotive & Tire');
    update_option('blogdescription', 'Honest auto care. More good miles.');
    update_option('timezone_string', 'America/Chicago');
    update_option('permalink_structure', '/%postname%/');
    flush_rewrite_rules();
}
add_action('after_switch_theme', 'wsa_seed_pages');
