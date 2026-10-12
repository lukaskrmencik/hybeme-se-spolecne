<?php

use Clickbar\Magellan\IO\Generator\Geojson\GeojsonGenerator;
use Clickbar\Magellan\IO\Generator\WKT\WKTGenerator;

return [
    'schema' => 'public',

    'json_generator' => GeojsonGenerator::class,

    'sql_generator' => WKTGenerator::class,

    'string_generator' => WKTGenerator::class,

    'geodetic_srids' => [
        4326,
        4267,
        4269,
    ],

    'geodetic_default_srid' => 4326,
];
