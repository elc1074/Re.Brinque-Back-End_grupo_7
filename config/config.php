<?php
// config/config.php
return [
    'jwt' => [
        'key' => getenv('JWT_KEY') ?: 'aksdkasdaksdkasdkasdkasdkakefcsdcsd',

        'iss' => getenv('JWT_ISS') ?: 'http://localhost', 
        'aud' => getenv('JWT_AUD') ?: 'http://localhost',
    ]
];