<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_ANON_KEY');

$phone = $_GET['phone'] ?? $_POST['phone'] ?? '';
$classLevel = $_GET['class'] ?? $_POST['class_level'] ?? '';

if (empty($phone) || empty($classLevel)) {
    echo json_encode(['hasAccess' => false, 'message' => 'Missing parameters']);
    exit;
}

// Query Supabase for active session
$ch = curl_init($supabaseUrl . '/rest/v1/rpc/check_user_access?p_phone=' . urlencode($phone) . '&p_class_level=' . urlencode($classLevel));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseKey,
    'Authorization: Bearer ' . $supabaseKey
]);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
curl_close($ch);

$result = json_decode($response, true);

if ($result && isset($result[0])) {
    echo json_encode([
        'hasAccess' => $result[0]['has_access'],
        'expires_at' => $result[0]['expires_at']
    ]);
} else {
    echo json_encode(['hasAccess' => false]);
}
?>
