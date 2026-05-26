<?php
// PesaPal - Initiate Payment
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Get credentials from environment
$consumerKey = getenv('PESAPAL_CONSUMER_KEY');
$consumerSecret = getenv('PESAPAL_CONSUMER_SECRET');
$ipnId = getenv('PESAPAL_IPN_ID');
$isSandbox = getenv('PESAPAL_MODE') !== 'live';

// Set API URLs based on mode
if ($isSandbox) {
    $apiUrl = 'https://cybqa.pesapal.com/pesapalv3/api/Transactions/SubmitOrderRequest';
} else {
    $apiUrl = 'https://pay.pesapal.com/v3/api/Transactions/SubmitOrderRequest';
}

// Get request data
$input = json_decode(file_get_contents('php://input'), true);
$amount = $input['amount'] ?? 20;
$phone = $input['phone'] ?? '';
$email = $input['email'] ?? 'student@niconxlearning.co.ke';
$classLevel = $input['class_level'] ?? 'grade4';
$name = $input['name'] ?? 'Student';

// Clean phone number for display
$cleanPhone = preg_replace('/^0/', '254', $phone);

// Generate unique order reference
$orderReference = 'NICONX_' . time() . '_' . uniqid();

// Callback URL (where user returns after payment)
$callbackUrl = 'https://' . $_SERVER['HTTP_HOST'] . '/payment-callback.html';

// First, get authentication token
$authUrl = $isSandbox 
    ? 'https://cybqa.pesapal.com/pesapalv3/api/Auth/RequestToken'
    : 'https://pay.pesapal.com/v3/api/Auth/RequestToken';

$authData = json_encode([
    'consumer_key' => $consumerKey,
    'consumer_secret' => $consumerSecret
]);

$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $authUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, $authData);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json'
]);

$authResponse = curl_exec($ch);
$authResult = json_decode($authResponse, true);
curl_close($ch);

if (!isset($authResult['token'])) {
    echo json_encode([
        'success' => false,
        'message' => 'Authentication failed: ' . ($authResult['error'] ?? 'Unknown error')
    ]);
    exit;
}

$token = $authResult['token'];

// Prepare payment request [citation:4][citation:8]
$paymentData = [
    'id' => $orderReference,
    'currency' => 'KES',
    'amount' => (float)$amount,
    'description' => 'NiconX Learning Access - ' . strtoupper($classLevel),
    'callback_url' => $callbackUrl,
    'notification_id' => $ipnId,
    'branch' => 'NiconX Learning Hub',
    'billing_address' => [
        'email_address' => $email,
        'phone_number' => $cleanPhone,
        'country_code' => 'KE',
        'first_name' => $name,
        'middle_name' => '',
        'last_name' => 'Learner',
        'line_1' => 'Online',
        'line_2' => '',
        'city' => 'Nairobi',
        'state' => 'Nairobi',
        'postal_code' => '00100',
        'zip_code' => '00100'
    ]
];

// Submit payment order to PesaPal
$ch = curl_init();
curl_setopt($ch, CURLOPT_URL, $apiUrl);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($paymentData));
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json',
    'Accept: application/json',
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

$result = json_decode($response, true);

if ($httpCode === 200 && isset($result['redirect_url'])) {
    // Store order info in session/local storage via response
    echo json_encode([
        'success' => true,
        'message' => 'Redirect to payment page',
        'redirect_url' => $result['redirect_url'],
        'order_tracking_id' => $result['order_tracking_id'] ?? '',
        'merchant_reference' => $orderReference
    ]);
} else {
    $errorMsg = $result['error']['message'] ?? $result['message'] ?? 'Payment initiation failed';
    echo json_encode([
        'success' => false,
        'message' => $errorMsg
    ]);
}
?>
