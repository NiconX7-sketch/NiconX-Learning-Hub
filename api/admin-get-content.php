<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');

$supabaseUrl = getenv('SUPABASE_URL') ?: 'YOUR_SUPABASE_URL';
$supabaseKey = getenv('SUPABASE_ANON_KEY') ?: 'YOUR_SUPABASE_ANON_KEY';

$class = $_GET['class'] ?? '';
$subject = $_GET['subject'] ?? '';
$topic = $_GET['topic'] ?? '';
$detailed = $_GET['detailed'] ?? false;

if ($detailed && $topic) {
    // Get single topic
    $url = $supabaseUrl . "/rest/v1/content?topic=eq.$topic&select=*";
} else {
    // Get all topics for dashboard
    $url = $supabaseUrl . "/rest/v1/content?class_level=eq.$class&order=topic_order.asc";
}

$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $url);
curl_setopt($curl, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseKey,
    'Authorization: Bearer ' . $supabaseKey
]);
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($curl);
curl_close($curl);

echo $response;
?>