<?php

header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");

require_once "db.php";

// Allow only POST requests
if ($_SERVER["REQUEST_METHOD"] !== "POST") {
    http_response_code(405);
    echo json_encode([
        "success" => false,
        "message" => "Method Not Allowed"
    ]);
    exit();
}

// Read JSON body
$data = json_decode(file_get_contents("php://input"), true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON data."
    ]);
    exit();
}

// Get values
$fullname  = trim($data["firstname"] ?? "");
$email      = trim($data["email"] ?? "");
$phone      = trim($data["phone"] ?? "");
$company    = trim($data["company"] ?? "");
$employees  = trim($data["employees"] ?? "");
$country = trim($data["country"] ?? "");

// Validate required fields
if (
    empty($fullname) ||
    empty($country) ||
    empty($email) ||
    empty($company) ||
    empty($phone)
) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Please fill all required fields."
    ]);

    exit();
}

// Validate email
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);

    echo json_encode([
        "success" => false,
        "message" => "Invalid email address."
    ]);

    exit();
}

// Insert into database
$sql = "INSERT INTO CedarBank
(fullname, email, company, phone, employees, country)
VALUES (?, ?, ?, ?, ?, ?)";

$stmt = $conn->prepare($sql);

if (!$stmt) {
    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $conn->error
    ]);

    exit();
}

$stmt->bind_param(
    "ssssss",
    $fullname,
    $email,
    $company,
    $phone,
    $employees,
    $country
);

if ($stmt->execute()) {

    // Send notification email
    $to = "support@cedarpayroll.com";
    $subject = "New Cedar Payroll Enquiry";

    $message = "
    <html>
    <body>
        <h2>New Cedar Payroll Enquiry</h2>

        <p><strong>Full Name:</strong> {$fullname}</p>
        <p><strong>Email:</strong> {$email}</p>
        <p><strong>Phone:</strong> {$phone}</p>
        <p><strong>Company:</strong> {$company}</p>
        <p><strong>Employees:</strong> {$employees}</p>

        <p><strong>Country:</strong></p>
        <p>{$country}</p>
    </body>
    </html>
    ";

    $headers  = "MIME-Version: 1.0\r\n";
    $headers .= "Content-Type: text/html; charset=UTF-8\r\n";
    $headers .= "From: Cedar Payroll <noreply@cedarpayroll.com>\r\n";
    $headers .= "Reply-To: {$email}\r\n";

    // Send email
    mail($to, $subject, $message, $headers);

    echo json_encode([
        "success" => true,
        "message" => "Form submitted successfully."
    ]);

} else {

    http_response_code(500);

    echo json_encode([
        "success" => false,
        "message" => $stmt->error
    ]);
}

$stmt->close();
$conn->close();

?>