<?php

// Database Configuration
$host = "77.37.35.182";              // Usually localhost on Hostinger
$dbname = "u687219523_PhoeniciaHold";   // e.g. u123456789_mydb
$username = "u687219523_admin"; // e.g. u123456789_user
$password = "NNVqANR22+sY9uT";

// Create Connection
$conn = new mysqli($host, $username, $password, $dbname);

// Check Connection
if ($conn->connect_error) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => "Database connection failed."
    ]);

    exit();
}

// Set Character Encoding
$conn->set_charset("utf8mb4");

?>