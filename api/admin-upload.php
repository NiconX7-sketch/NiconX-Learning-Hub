<?php
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST');
header('Access-Control-Allow-Headers: Content-Type');

// Supabase configuration
$supabaseUrl = getenv('SUPABASE_URL') ?: 'YOUR_SUPABASE_URL';
$supabaseKey = getenv('SUPABASE_ANON_KEY') ?: 'YOUR_SUPABASE_ANON_KEY';

// Get POST data
$data = json_decode(file_get_contents('php://input'), true);

if (!$data) {
    echo json_encode(['success' => false, 'message' => 'No data received']);
    exit;
}

// Validate required fields
$required = ['class_level', 'subject', 'topic', 'notes'];
foreach ($required as $field) {
    if (empty($data[$field])) {
        echo json_encode(['success' => false, 'message' => "Missing field: $field"]);
        exit;
    }
}

// Prepare data for Supabase
$insertData = [
    'class_level' => $data['class_level'],
    'subject' => $data['subject'],
    'topic' => $data['topic'],
    'topic_order' => $data['topic_order'] ?? 1,
    'notes' => $data['notes'],
    'questions' => json_encode($data['questions'] ?? []),
    'images' => json_encode($data['images'] ?? []),
    'is_free' => $data['is_free'] ?? false,
    'created_at' => date('Y-m-d H:i:s')
];

// Insert into Supabase
$url = $supabaseUrl . '/rest/v1/content';
$curl = curl_init();
curl_setopt($curl, CURLOPT_URL, $url);
curl_setopt($curl, CURLOPT_HTTPHEADER, [
    'apikey: ' . $supabaseKey,
    'Authorization: Bearer ' . $supabaseKey,
    'Content-Type: application/json',
    'Prefer: return=representation'
]);
curl_setopt($curl, CURLOPT_POST, true);
curl_setopt($curl, CURLOPT_POSTFIELDS, json_encode($insertData));
curl_setopt($curl, CURLOPT_RETURNTRANSFER, true);

$response = curl_exec($curl);
$httpCode = curl_getinfo($curl, CURLINFO_HTTP_CODE);
curl_close($curl);

if ($httpCode === 201) {
    echo json_encode(['success' => true, 'message' => 'Content published successfully']);
} else {
    echo json_encode(['success' => false, 'message' => 'Database error: ' . $response]);
}
?>