<?php
// Receives contact form messages and forwards them to selected channels.
// Keep private delivery settings on the server, never in frontend JavaScript.

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode([
        'success' => false,
        'message' => 'Only POST requests are allowed.',
    ]);
    exit;
}

$privateConfigPath = __DIR__ . '/telegram-config.php';
$privateConfig = file_exists($privateConfigPath) ? require $privateConfigPath : [];

$botToken = getenv('TELEGRAM_BOT_TOKEN') ?: ($privateConfig['bot_token'] ?? '');
$chatId = getenv('TELEGRAM_CHAT_ID') ?: ($privateConfig['chat_id'] ?? '-5209874277');
$emailTo = getenv('CONTACT_EMAIL_TO') ?: ($privateConfig['email_to'] ?? 'ryranuth999@gmail.com');
$smtpConfig = [
    'host' => getenv('SMTP_HOST') ?: ($privateConfig['smtp_host'] ?? ''),
    'port' => (int) (getenv('SMTP_PORT') ?: ($privateConfig['smtp_port'] ?? 587)),
    'username' => getenv('SMTP_USERNAME') ?: ($privateConfig['smtp_username'] ?? ''),
    'password' => getenv('SMTP_PASSWORD') ?: ($privateConfig['smtp_password'] ?? ''),
    'from_email' => getenv('SMTP_FROM_EMAIL') ?: ($privateConfig['smtp_from_email'] ?? ''),
    'from_name' => getenv('SMTP_FROM_NAME') ?: ($privateConfig['smtp_from_name'] ?? 'Ry Ranuth Portfolio'),
];

$rawInput = file_get_contents('php://input');
$data = json_decode($rawInput, true);

if (!is_array($data)) {
    $data = $_POST;
}

$name = trim($data['name'] ?? '');
$email = trim($data['email'] ?? '');
$subject = trim($data['subject'] ?? '');
$message = trim($data['message'] ?? '');
$delivery = $data['delivery'] ?? ['telegram', 'email'];

if (is_string($delivery)) {
    $delivery = array_map('trim', explode(',', $delivery));
}

if (!is_array($delivery)) {
    $delivery = [];
}

$delivery = array_filter($delivery, 'is_string');
$delivery = array_values(array_intersect(['telegram', 'email'], array_unique($delivery)));

if (strlen($name) < 2 || strlen($subject) < 3 || strlen($message) < 10 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Please complete the form with valid information.',
    ]);
    exit;
}

if (empty($delivery)) {
    http_response_code(422);
    echo json_encode([
        'success' => false,
        'message' => 'Please choose Telegram, Email, or both.',
    ]);
    exit;
}

function clean_for_telegram($value)
{
    return htmlspecialchars($value, ENT_QUOTES | ENT_SUBSTITUTE, 'UTF-8');
}

function clean_for_header($value)
{
    return trim(str_replace(["\r", "\n"], '', $value));
}

function smtp_read_response($socket)
{
    $response = '';

    while (($line = fgets($socket, 515)) !== false) {
        $response .= $line;

        if (isset($line[3]) && $line[3] === ' ') {
            break;
        }
    }

    return $response;
}

function smtp_expect($socket, $expectedCodes, $errorMessage = 'SMTP server rejected the email.')
{
    $response = smtp_read_response($socket);
    $code = (int) substr($response, 0, 3);

    if (!in_array($code, $expectedCodes, true)) {
        throw new RuntimeException($errorMessage);
    }

    return $response;
}

function smtp_command($socket, $command, $expectedCodes, $errorMessage = 'SMTP server rejected the email.')
{
    fwrite($socket, $command . "\r\n");
    return smtp_expect($socket, $expectedCodes, $errorMessage);
}

function smtp_address($email, $name = '')
{
    $email = clean_for_header($email);
    $name = trim(clean_for_header($name));

    if ($name === '') {
        return '<' . $email . '>';
    }

    return '"' . addcslashes($name, '"\\') . '" <' . $email . '>';
}

function smtp_data_value($value)
{
    $value = str_replace(["\r\n", "\r"], "\n", $value);
    $value = str_replace("\n.", "\n..", $value);
    return str_replace("\n", "\r\n", $value);
}

function send_smtp_mail($config, $toEmail, $replyToEmail, $replyToName, $subject, $body)
{
    if (empty($config['host']) || empty($config['username']) || empty($config['password'])) {
        return [
            'sent' => false,
            'configured' => false,
            'message' => 'Gmail SMTP is not configured.',
        ];
    }

    $host = $config['host'];
    $port = (int) ($config['port'] ?: 587);
    $fromEmail = $config['from_email'] ?: $config['username'];
    $fromName = $config['from_name'] ?: 'Portfolio Contact';
    $remote = ($port === 465 ? 'ssl://' : '') . $host . ':' . $port;
    $socket = @stream_socket_client($remote, $errno, $errstr, 12);

    if (!$socket) {
        return [
            'sent' => false,
            'configured' => true,
            'message' => 'Could not connect to Gmail SMTP.',
        ];
    }

    stream_set_timeout($socket, 12);

    try {
        smtp_expect($socket, [220], 'Gmail SMTP did not answer.');
        smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250], 'Gmail SMTP rejected the hello request.');

        if ($port !== 465) {
            smtp_command($socket, 'STARTTLS', [220], 'Gmail SMTP could not start a secure connection.');

            if (!stream_socket_enable_crypto($socket, true, STREAM_CRYPTO_METHOD_TLS_CLIENT)) {
                throw new RuntimeException('Could not secure the Gmail SMTP connection.');
            }

            smtp_command($socket, 'EHLO ' . ($_SERVER['SERVER_NAME'] ?? 'localhost'), [250], 'Gmail SMTP rejected the secure hello request.');
        }

        smtp_command($socket, 'AUTH LOGIN', [334], 'Gmail SMTP login is not available.');
        smtp_command($socket, base64_encode($config['username']), [334], 'Gmail did not accept the email address.');
        smtp_command($socket, base64_encode($config['password']), [235], 'Gmail login failed. Please check the Gmail address and create a new App Password.');
        smtp_command($socket, 'MAIL FROM:<' . clean_for_header($fromEmail) . '>', [250], 'Gmail rejected the sender address.');
        smtp_command($socket, 'RCPT TO:<' . clean_for_header($toEmail) . '>', [250, 251], 'Gmail rejected the receiver address.');
        smtp_command($socket, 'DATA', [354], 'Gmail rejected the email body.');

        $headers = implode("\r\n", [
            'From: ' . smtp_address($fromEmail, $fromName),
            'To: ' . smtp_address($toEmail),
            'Reply-To: ' . smtp_address($replyToEmail, $replyToName),
            'Subject: ' . clean_for_header($subject),
            'MIME-Version: 1.0',
            'Content-Type: text/plain; charset=UTF-8',
        ]);

        fwrite($socket, $headers . "\r\n\r\n" . smtp_data_value($body) . "\r\n.\r\n");
        smtp_expect($socket, [250]);
        smtp_command($socket, 'QUIT', [221, 250], 'Gmail ended the SMTP session unexpectedly.');
        fclose($socket);

        return [
            'sent' => true,
            'configured' => true,
            'message' => '',
        ];
    } catch (RuntimeException $exception) {
        fclose($socket);
        return [
            'sent' => false,
            'configured' => true,
            'message' => $exception->getMessage(),
        ];
    }
}

$sentChannels = [];
$deliveryErrors = [];

if (in_array('telegram', $delivery, true)) {
    if (!$botToken || !$chatId) {
        $deliveryErrors[] = 'Telegram is not configured on the server.';
    } else {
        $telegramMessage = implode("\n", [
            "<b>New portfolio contact message</b>",
            "",
            "<b>Name:</b> " . clean_for_telegram($name),
            "<b>Email:</b> " . clean_for_telegram($email),
            "<b>Subject:</b> " . clean_for_telegram($subject),
            "",
            "<b>Message:</b>",
            clean_for_telegram($message),
        ]);

        $payload = json_encode([
            'chat_id' => $chatId,
            'text' => $telegramMessage,
            'parse_mode' => 'HTML',
            'disable_web_page_preview' => true,
        ]);

        $telegramUrl = "https://api.telegram.org/bot{$botToken}/sendMessage";
        $context = stream_context_create([
            'http' => [
                'method' => 'POST',
                'header' => "Content-Type: application/json\r\n",
                'content' => $payload,
                'timeout' => 10,
                'ignore_errors' => true,
            ],
        ]);

        $response = @file_get_contents($telegramUrl, false, $context);
        $result = json_decode($response ?: '', true);

        if (is_array($result) && !empty($result['ok'])) {
            $sentChannels[] = 'Telegram';
        } else {
            $deliveryErrors[] = 'Telegram did not accept the message.';
        }
    }
}

if (in_array('email', $delivery, true)) {
    if (!filter_var($emailTo, FILTER_VALIDATE_EMAIL)) {
        $deliveryErrors[] = 'Contact email is not configured correctly.';
    } else {
        $host = preg_replace('/[^a-zA-Z0-9.-]/', '', explode(':', $_SERVER['HTTP_HOST'] ?? 'localhost')[0]);
        $fromDomain = $host ?: 'localhost';
        $emailSubject = clean_for_header('Portfolio contact: ' . $subject);
        $emailBody = implode("\n", [
            'New portfolio contact message',
            '',
            'Name: ' . $name,
            'Email: ' . $email,
            'Subject: ' . $subject,
            '',
            'Message:',
            $message,
        ]);
        $headers = implode("\r\n", [
            'From: Portfolio Contact <no-reply@' . $fromDomain . '>',
            'Reply-To: ' . clean_for_header($email),
            'Content-Type: text/plain; charset=UTF-8',
            'X-Mailer: PHP/' . phpversion(),
        ]);

        $smtpResult = send_smtp_mail($smtpConfig, $emailTo, $email, $name, $emailSubject, $emailBody);

        if ($smtpResult['sent'] || (!$smtpResult['configured'] && @mail($emailTo, $emailSubject, $emailBody, $headers))) {
            $sentChannels[] = 'Email';
        } else {
            $deliveryErrors[] = $smtpResult['message'] ?: 'Email could not be sent from this server.';
        }
    }
}

if (empty($sentChannels)) {
    http_response_code(502);
    echo json_encode([
        'success' => false,
        'message' => implode(' ', $deliveryErrors) ?: 'Message could not be sent.',
    ]);
    exit;
}

$statusMessage = 'Message sent to ' . implode(' and ', $sentChannels) . '. Thank you for contacting me.';

if (!empty($deliveryErrors)) {
    $statusMessage .= ' Note: ' . implode(' ', $deliveryErrors);
}

echo json_encode([
    'success' => true,
    'message' => $statusMessage,
]);
