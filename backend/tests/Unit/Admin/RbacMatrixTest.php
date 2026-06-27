<?php

declare(strict_types=1);

use App\Modules\Admin\Rbac;
use App\Modules\Tenancy\Models\Branch;
use Tests\TestCase;

/*
|--------------------------------------------------------------------------
| RBAC matrix conformance test
|--------------------------------------------------------------------------
| Source of truth: docs/08-rbac-matrix.md (Foundation §5).
| This test parses the markdown tables and asserts the seeded
| permissions on each role match the documented matrix exactly.
|
| The full HA wildcard grant is collapsed to "all catalogue perms"
| for the assertion; the explicit ROLE_PERMISSIONS entry uses `*`.
*/

const ROLE_KEYS = ['HA', 'DR', 'NU', 'RC', 'RO', 'PH', 'LT', 'RD', 'CA', 'PT'];

const ROLE_SLUGS = [
    'HA' => 'hospital-admin',
    'DR' => 'doctor',
    'NU' => 'nurse',
    'RC' => 'receptionist',
    'RO' => 'records-officer',
    'PH' => 'pharmacist',
    'LT' => 'lab-technician',
    'RD' => 'radiologist',
    'CA' => 'cashier',
    'PT' => 'patient',
];

beforeEach(function () {
    $this->artisan('migrate:fresh');
    $this->branch = Branch::create([
        'code' => 'NRB', 'name' => 'Nairobi', 'is_active' => true,
    ]);
    app()->instance('active_branch_id', $this->branch->id);
    Rbac::seed(app());
    app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();
});

/**
 * Parse the RBAC matrix from docs/08-rbac-matrix.md.
 *
 * The doc contains many markdown tables of the form:
 *   | Permission | HA | DR | NU | RC | RO | PH | LT | RD | CA | PT |
 *   | --- |:--:|...|
 *   | `some.perm` | ✓ | ✗ | ... |
 *
 * We collect every (permission, [10 cells]) tuple from the doc.
 *
 * @return array<string, array<string, bool>>  perm => [roleKey => has]
 */
function parseRbacMatrix(string $path): array
{
    $contents = file_get_contents($path);
    if ($contents === false) {
        throw new RuntimeException("Cannot read $path");
    }

    $rows = [];

    // Split by lines, find tables whose header row contains our 10 role keys
    // in order. State machine: outside-table → in-table.
    $lines = preg_split('/\R/u', $contents);
    $i = 0;
    $n = count($lines);
    while ($i < $n) {
        $line = $lines[$i];

        // Header row: must have all 10 role keys in order
        $isHeader = false;
        $headerCells = parseTableRow($line);
        if (count($headerCells) >= 11) {
            $tail = array_slice($headerCells, 1, 10);
            $isHeader = $tail === ROLE_KEYS;
        }

        if (! $isHeader) {
            $i++;
            continue;
        }

        // Skip the separator row (---|---...)
        $i++;
        if ($i < $n && preg_match('/^\|?[\s:|-]+\|?$/', $lines[$i])) {
            $i++;
        }

        // Read data rows until we hit a non-table line
        while ($i < $n) {
            $row = parseTableRow($lines[$i]);
            if (count($row) < 11) {
                break; // end of this table
            }
            $perm = trim($row[0], " \t`");
            if ($perm === '' || $perm === 'Permission') {
                $i++;
                continue;
            }
            $cells = array_slice($row, 1, 10);
            $map = [];
            foreach (ROLE_KEYS as $idx => $key) {
                $c = trim($cells[$idx]);
                $map[$key] = ($c === '✓');
            }
            $rows[$perm] = $map;
            $i++;
        }
    }

    return $rows;
}

/**
 * Split a markdown table row into cells, trimming pipes and whitespace.
 * Returns [] if the line doesn't look like a table row.
 *
 * @return array<int, string>
 */
function parseTableRow(string $line): array
{
    $line = trim($line);
    if ($line === '' || ! str_contains($line, '|')) {
        return [];
    }
    // Strip leading/trailing pipes then split
    $line = trim($line, '|');
    $parts = explode('|', $line);

    return array_map('trim', $parts);
}

test('docs/08-rbac-matrix.md exists and parses', function () {
    $path = base_path('../docs/08-rbac-matrix.md');
    expect(file_exists($path))->toBeTrue("RBAC matrix doc not found at $path");

    $matrix = parseRbacMatrix($path);
    expect($matrix)->not->toBeEmpty('No RBAC tables were parsed from the doc');

    // Sanity: every row should be keyed by a permission string
    foreach (array_keys($matrix) as $perm) {
        expect($perm)->toMatch('/^[a-z][a-z0-9-]*\.[a-z0-9.-]+$/');
    }
});

test('every catalogued permission appears in the doc', function () {
    $path = base_path('../docs/08-rbac-matrix.md');
    $matrix = parseRbacMatrix($path);

    $catalog = Rbac::PERMISSIONS;
    $missing = array_diff($catalog, array_keys($matrix));
    $extra = array_diff(array_keys($matrix), $catalog);

    // The doc may legitimately have permissions we haven't yet wired into
    // Rbac::PERMISSIONS (forward refs). Flag them but don't fail.
    // Conversely, catalogue entries missing from the doc IS a fail.
    expect($missing)->toBeEmpty(
        "These permissions are in Rbac::PERMISSIONS but missing from the doc: ".
        implode(', ', $missing)
    );

    if ($extra !== []) {
        fwrite(STDERR, "\n[i] Doc has permissions not yet in Rbac::PERMISSIONS (forward refs): ".
            implode(', ', $extra)."\n");
    }
});

test('every (role, permission) cell in the doc matches the seeded grants', function () {
    $path = base_path('../docs/08-rbac-matrix.md');
    $matrix = parseRbacMatrix($path);

    $mismatches = [];
    foreach ($matrix as $perm => $expected) {
        foreach (ROLE_KEYS as $key) {
            $slug = ROLE_SLUGS[$key];
            $role = Spatie\Permission\Models\Role::findByName($slug, 'web');
            $has = $role->hasPermissionTo($perm);

            if ($has !== $expected[$key]) {
                $mismatches[] = sprintf(
                    '%-40s role=%-16s  doc=%s  seeded=%s',
                    $perm, $slug,
                    $expected[$key] ? '✓' : '✗',
                    $has ? '✓' : '✗',
                );
            }
        }
    }

    if ($mismatches !== []) {
        fwrite(STDERR, "\n[x] RBAC matrix mismatches between docs/08-rbac-matrix.md and Rbac::ROLE_PERMISSIONS:\n");
        foreach ($mismatches as $line) {
            fwrite(STDERR, "    $line\n");
        }
        fwrite(STDERR, "\nFix either: (a) the doc, or (b) Rbac::ROLE_PERMISSIONS — then re-run this test.\n");
    }

    expect($mismatches)->toBeEmpty();
});

test('every catalogue permission is granted to at least one role', function () {
    $orphans = [];
    foreach (Rbac::PERMISSIONS as $perm) {
        // Some permissions are intentionally never granted (e.g. emr.delete —
        // clinical records are never hard-deleted, per foundation §11).
        if (in_array($perm, Rbac::NEVER_GRANTED, true)) {
            continue;
        }
        $granted = false;
        foreach (ROLE_SLUGS as $slug) {
            $role = Spatie\Permission\Models\Role::findByName($slug, 'web');
            if ($role->hasPermissionTo($perm)) {
                $granted = true;
                break;
            }
        }
        if (! $granted) {
            $orphans[] = $perm;
        }
    }

    expect($orphans)->toBeEmpty(
        'These permissions are in the catalogue but granted to NO role: '.
        implode(', ', $orphans)
    );
});

test('role slugs are exactly the 10 defined in the foundation', function () {
    // Rbac::ROLES is keyed slug => label; the slugs are the keys.
    expect(array_values(ROLE_SLUGS))->toEqualCanonicalizing(array_keys(Rbac::ROLES));
});
