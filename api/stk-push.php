<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Load environment variables (from Vercel env or .env file)
$consumerKey = getenv('MPESA_CONSUMER_KEY') ?: 'YOUR_SANDBOX_CONSUMER_KEY';
$consumerSecret = getenv('MPESA_CONSUMER_SECRET') ?: 'YOUR_SANDBOX_CONSUMER_SECRET';
$passkey = getenv('MPESA_PASSKEY') ?: 'YOUR_PASSKEY';
$shortcode = getenv('MPESA_SHORTCODE') ?: '174379'; // Sandbox test shortcode
$callbackUrl = getenv('MPESA_CALLBACK_URL') ?: 'https://your-vercel-app.vercel.app/api/mpesa-callback.php';

// Get request data
$data = json_decode(file_get_contents('php://input'), true);
$phone = $data['phone'];
$amount = $data['amount'];
$class_level = $data['class_level'];

// Format phone number to 2547XXXXXXXX
$phone = preg_replace('/^0/', '254', $phone);

// Get OAuth token
function getAccessToken($consumerKey, $consumerSecret) {
    $url = 'https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials';
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Authorization: Basic ' . base64_encode($consumerKey . ':' . $consumerSecret)));
    curl_setopt($curl, CURLOPT_HEADER, false);
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($curl);
    $result = json_decode($response);
    curl_close($curl);
    return $result->access_token;
}

// STK Push
function stkPush($token, $shortcode, $passkey, $phone, $amount, $callbackUrl) {
    $timestamp = date('YmdHis');
    $password = base64_encode($shortcode . $passkey . $timestamp);
    
    $url = 'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest';
    $curl = curl_init();
    curl_setopt($curl, CURLOPT_URL, $url);
    curl_setopt($curl, CURLOPT_HTTPHEADER, array('Authorization: Bearer ' . $token, 'Content-Type: application/json'));
    curl_setopt($curl, CURLOPT_POST, true);
    curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode([
        'BusinessShortCode' => $shortcode,
        'Password' => $password,
        'Timestamp' => $timestamp,
        'TransactionType' => 'CustomerPayBillOnline',
        'Amount' => $amount,
        'PartyA' => $phone,
        'PartyB' => $shortcode,
        'PhoneNumber' => $phone,
        'CallBackURL' => $callbackUrl,
        'AccountReference' => 'NiconX_' . time(),
        'TransactionDesc' => 'NiconX Learning Access'
    ]));
    curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
    $response = curl_exec($curl);
    curl_close($curl);
    return json_decode($response);
}

try {
    $token = getAccessToken($consumerKey, $consumerSecret);
    $result = stkPush($token, $shortcode, $passkey, $phone, $amount, $callbackUrl);
    
    if ($result && isset($result->ResponseCode) && $result->ResponseCode == '0') {
        echo json_encode([
            'success' => true,
            'message' => 'STK Push sent successfully',
            'checkoutRequestID' => $result->CheckoutRequestID
        ]);
    } else {
        echo json_encode([
            'success' => false,
            'message' => $result->errorMessage ?? 'STK Push failed'
        ]);
    }
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'message' => $e->getMessage()
    ]);
}
?>