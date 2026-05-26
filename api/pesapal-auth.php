<?php
// PesaPal Authentication - Get OAuth Token
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET');
header('Access-Control-Allow-Headers: Content-Type');

// Get credentials from environment
$consumerKey = getenv('PESAPAL_CONSUMER_KEY');
$consumerSecret = getenv('PESAPAL_CONSUMER_SECRET');
$isSandbox = getenv('PESAPAL_MODE') !== 'live';

// Set API URLs based on mode
if ($isSandbox) {
    $authUrl = 'https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken';
} else {
    $authUrl = 'https://pay.pesapal.com/v3/api/Auth/RequestToken';
}

// Prepare authentication request [citation:3][citation:4]
$postData = json_encode([
    'consumer_key' => $consumerKey,
    'consumer_secret' => $consumerSecret
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $postData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($httpCode === 200) {
    $result = json_decode($response, true);
    echo json_encode([
        'success' => true,
        'token' => $result['token'] ?? '',
        'expiry_date' => $result['expiry_date'] ?? ''
    ]);
} else {
    echo json_encode([
        'success' => false,
        'message' => 'Authentication failed: ' . $response
    ]);
}
?>
