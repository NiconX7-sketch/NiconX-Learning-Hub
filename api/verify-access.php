<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

// Supabase connection
$supabaseUrl = getenv('SUPABASE_URL');
$supabaseKey = getenv('SUPABASE_ANON_KEY');

$data = json_decode(file_get_contents('php://input'), true);
$phone = $data['phone'];
$class_level = $data['class_level'];

// Query Supabase for active session
function checkSession($supabaseUrl, $supabaseKey, $phone, $class_level) {
    $url = $supabaseUrl . "/rest/v1/rpc/check_active_session";
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_HTTPHEADER, [
        'apikey: ' . $supabaseKey,
        'Authorization: Bearer ' . $supabaseKey,
        'Content-Type: application/json'
    ]);
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode([
        'p_phone' => $phone,
        'p_class' => $class_level
    ]));
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($curl);
    curl_close($curl);
    return json_decode($response, true);
}

$result = checkSession($supabaseUrl, $supabaseKey, $phone, $class_level);

if ($result && isset($result[0]) && $result[0]['has_access']) {
    echo json_encode([
        'hasAccess' => true,
        'expires_at' => $result[0]['expires_at']
    ]);
} else {
    echo json_encode(['hasAccess' => false]);
}
?>