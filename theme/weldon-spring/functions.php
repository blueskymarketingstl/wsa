<?php
if (!defined('ABSPATH')) { exit; }
require_once __DIR__ . '/inc/content.php';
require_once __DIR__ . '/inc/settings.php';
require_once __DIR__ . '/inc/contact.php';
add_action('after_setup_theme', function () {
    add_theme_support('title-tag');
    add_theme_support('post-thumbnails');
    add_theme_support('html5', ['search-form', 'gallery', 'caption', 'style', 'script']);
});
add_action('wp_enqueue_scripts', function () {
    wp_enqueue_style('wsa', get_stylesheet_uri(), [], filemtime(__DIR__ . '/style.css'));
    wp_enqueue_script('wsa', get_template_directory_uri() . '/assets/site.js', [], filemtime(__DIR__ . '/assets/site.js'), true);
    wp_localize_script('wsa', 'wsaSite', ['search' => rest_url('wsa/v1/search')]);
});
function wsa_asset($name) { return get_template_directory_uri() . '/assets/' . $name; }
function wsa_url($path = '') { return home_url('/' . ltrim($path, '/')); }
function wsa_image($name, $alt, $class = '', $eager = false) {
    $path = __DIR__ . '/assets/' . basename($name);
    $size = file_exists($path) ? getimagesize($path) : false;
    printf('<img src="%s" alt="%s" class="%s" %s %s>', esc_url(wsa_asset(basename($name))), esc_attr($alt), esc_attr($class), $size ? 'width="' . (int)$size[0] . '" height="' . (int)$size[1] . '"' : '', $eager ? 'fetchpriority="high"' : 'loading="lazy" decoding="async"');
}
function wsa_icon($name) {
    $paths = [
        'arrow' => '<path d="M5 12h14m-6-6 6 6-6 6"/>',
        'search' => '<circle cx="10.5" cy="10.5" r="6.5"/><path d="m16 16 5 5"/>',
        'phone' => '<path d="M8 3H4a1 1 0 0 0-1 1c0 9.4 7.6 17 17 17a1 1 0 0 0 1-1v-4l-5-2-2 3a13 13 0 0 1-7-7l3-2-2-5Z"/>',
        'pin' => '<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>',
        'wifi' => '<path d="M2 8a16 16 0 0 1 20 0M5 12a11 11 0 0 1 14 0M9 16a5 5 0 0 1 6 0"/><circle cx="12" cy="20" r=".6"/>',
        'check' => '<path d="m5 12 4 4L19 6"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
        'wheel' => '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3"/><path d="m12 3 0 6m0 6v6M3 12h6m6 0h6"/>',
        'tool' => '<path d="M14 6a5 5 0 0 0-6 6L2 18l4 4 6-6a5 5 0 0 0 6-6l-4 3-3-3 3-4Z"/>',
        'shield' => '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
    ];
    return '<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' . ($paths[$name] ?? $paths['tool']) . '</svg>';
}
function wsa_button($text = 'Schedule a visit', $path = 'book/', $class = '') {
    echo '<a class="button ' . esc_attr($class) . '" href="' . esc_url(wsa_url($path)) . '">' . esc_html($text) . wsa_icon('arrow') . '</a>';
}
function wsa_services() {
    $parent = get_page_by_path('auto-repair');
    return $parent ? get_pages(['parent' => $parent->ID, 'sort_column' => 'menu_order,post_title']) : [];
}
function wsa_service_grid($limit = 0) {
    $services = wsa_services();
    if ($limit) {
        $order = ['brake-repair', 'oil-changes', 'suspension-steering', 'engine-diagnostics', 'heating-ac-repair', 'wheel-alignment'];
        usort($services, function($a, $b) use ($order) {
            $ai = array_search($a->post_name, $order, true); $bi = array_search($b->post_name, $order, true);
            return ($ai === false ? 100 : $ai) <=> ($bi === false ? 100 : $bi);
        });
        $services = array_slice($services, 0, $limit);
    }
    echo '<div class="service-grid">';
    foreach ($services as $i => $service) {
        echo '<a class="service-card" href="' . esc_url(get_permalink($service)) . '"><div class="service-image">';
        wsa_image(get_post_meta($service->ID, '_wsa_image', true), '', '', false);
        echo '<span class="service-number">' . esc_html(str_pad($i + 1, 2, '0', STR_PAD_LEFT)) . '</span></div><div class="service-info"><h3>' . esc_html($service->post_title) . '</h3><p>' . esc_html(wp_trim_words(wp_strip_all_tags($service->post_content), 19)) . '</p><span class="text-link">Explore service ' . wsa_icon('arrow') . '</span></div></a>';
    }
    echo '</div>';
}
add_action('rest_api_init', function () {
    register_rest_route('wsa/v1', '/search', [
        'methods' => 'GET', 'permission_callback' => '__return_true',
        'args' => ['q' => ['type' => 'string', 'sanitize_callback' => 'sanitize_text_field', 'validate_callback' => function($v) { return is_string($v) && strlen($v) <= 100; }]],
        'callback' => function($request) {
            $q = trim((string)$request->get_param('q'));
            if (strlen($q) < 2) { return rest_ensure_response([]); }
            $query = new WP_Query(['post_type' => ['page', 'post'], 'post_status' => 'publish', 's' => $q, 'posts_per_page' => 8]);
            return rest_ensure_response(array_map(function($p) {
                return ['title' => $p->post_title, 'url' => get_permalink($p), 'excerpt' => wp_trim_words(wp_strip_all_tags($p->post_content), 20)];
            }, $query->posts));
        }
    ]);
});
function wsa_has_seo_plugin() { return defined('WPSEO_VERSION') || defined('RANK_MATH_VERSION') || defined('AIOSEO_VERSION'); }
add_action('wp_head', function () {
    if (wsa_has_seo_plugin()) { return; }
    $description = is_singular() ? get_the_excerpt(get_queried_object_id()) : get_bloginfo('description');
    $title = wp_get_document_title();
    $image = wsa_asset(is_front_page() ? 'hero.webp' : (get_post_meta(get_queried_object_id(), '_wsa_image', true) ?: 'trust.webp'));
    echo '<meta name="description" content="' . esc_attr(wp_strip_all_tags($description)) . '">' . "\n";
    echo '<meta property="og:title" content="' . esc_attr($title) . '"><meta property="og:description" content="' . esc_attr($description) . '"><meta property="og:image" content="' . esc_url($image) . '"><meta property="og:type" content="website"><meta name="twitter:card" content="summary_large_image">';
    if (is_singular()) { echo '<meta property="og:url" content="' . esc_url(get_permalink()) . '">'; }
    $schema = ['@context' => 'https://schema.org', '@type' => 'AutoRepair', '@id' => home_url('/#shop'), 'name' => html_entity_decode(get_bloginfo('name'), ENT_QUOTES, 'UTF-8'), 'url' => home_url('/'), 'image' => wsa_asset('Weldon-Spring-Auto-and-Tire-Logo.png'), 'telephone' => '+1-636-498-6600', 'address' => ['@type' => 'PostalAddress', 'streetAddress' => '818 O’Fallon Road', 'addressLocality' => 'St. Charles', 'addressRegion' => 'MO', 'postalCode' => '63304', 'addressCountry' => 'US'], 'areaServed' => ['Weldon Spring', 'St. Charles', 'St. Peters', 'O’Fallon'], 'openingHoursSpecification' => ['@type' => 'OpeningHoursSpecification', 'dayOfWeek' => ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'], 'opens' => '08:00', 'closes' => '17:00'], 'amenityFeature' => ['@type' => 'LocationFeatureSpecification', 'name' => 'Free guest Wi-Fi', 'value' => true]];
    if (get_post_meta(get_queried_object_id(), '_wsa_service', true)) {
        $schema = ['@context' => 'https://schema.org', '@graph' => [$schema, ['@type' => 'Service', 'name' => get_the_title(), 'serviceType' => get_the_title(), 'provider' => ['@id' => home_url('/#shop')], 'areaServed' => ['Weldon Spring', 'St. Charles', 'St. Peters', 'O’Fallon'], 'url' => get_permalink()]]];
    }
    echo '<script type="application/ld+json">' . wp_json_encode($schema, JSON_HEX_TAG | JSON_HEX_AMP | JSON_HEX_APOS | JSON_HEX_QUOT) . '</script>';
}, 5);
add_filter('document_title_parts', function($parts) {
    if (is_page() && !is_front_page()) { $parts['title'] = get_the_title() . ' | Weldon Spring & St. Charles, MO'; }
    return $parts;
});
