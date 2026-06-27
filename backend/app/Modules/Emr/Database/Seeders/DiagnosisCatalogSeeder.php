<?php

declare(strict_types=1);

namespace App\Modules\Emr\Database\Seeders;

use App\Modules\Emr\Models\DiagnosisCatalog;
use Illuminate\Database\Seeder;

/**
 * Starter ICD-10 set for local dev / pilot. Idempotent (keyed on `code`).
 * The production catalog is loaded from the full ICD-10 master separately.
 */
final class DiagnosisCatalogSeeder extends Seeder
{
    /** @var array<int, array{0:string,1:string,2:string}> code, description, category */
    private const ENTRIES = [
        ['A09',   'Infectious gastroenteritis and colitis, unspecified', 'Infectious diseases'],
        ['B50.9', 'Plasmodium falciparum malaria, unspecified',          'Infectious diseases'],
        ['B54',   'Unspecified malaria',                                  'Infectious diseases'],
        ['J00',   'Acute nasopharyngitis (common cold)',                  'Respiratory'],
        ['J02.9', 'Acute pharyngitis, unspecified',                       'Respiratory'],
        ['J06.9', 'Acute upper respiratory infection, unspecified',       'Respiratory'],
        ['J18.9', 'Pneumonia, unspecified organism',                      'Respiratory'],
        ['J45.9', 'Asthma, unspecified',                                  'Respiratory'],
        ['K21.9', 'Gastro-oesophageal reflux disease without oesophagitis', 'Digestive'],
        ['K29.7', 'Gastritis, unspecified',                               'Digestive'],
        ['E11.9', 'Type 2 diabetes mellitus without complications',       'Endocrine'],
        ['E78.5', 'Hyperlipidaemia, unspecified',                         'Endocrine'],
        ['I10',   'Essential (primary) hypertension',                     'Circulatory'],
        ['N39.0', 'Urinary tract infection, site not specified',          'Genitourinary'],
        ['M54.5', 'Low back pain',                                        'Musculoskeletal'],
        ['R51',   'Headache',                                             'Symptoms & signs'],
        ['R50.9', 'Fever, unspecified',                                   'Symptoms & signs'],
        ['R10.4', 'Other and unspecified abdominal pain',                 'Symptoms & signs'],
        ['Z00.0', 'General adult medical examination',                    'Factors influencing health'],
        ['Z23',   'Encounter for immunization',                          'Factors influencing health'],
    ];

    public function run(): void
    {
        foreach (self::ENTRIES as [$code, $description, $category]) {
            DiagnosisCatalog::query()->updateOrCreate(
                ['code' => $code],
                ['description' => $description, 'category' => $category, 'is_active' => true],
            );
        }
    }
}
