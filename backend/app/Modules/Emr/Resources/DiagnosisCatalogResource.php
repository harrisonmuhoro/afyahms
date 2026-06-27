<?php

declare(strict_types=1);

namespace App\Modules\Emr\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

/**
 * @mixin \App\Modules\Emr\Models\DiagnosisCatalog
 */
final class DiagnosisCatalogResource extends JsonResource
{
    /** @return array<string, mixed> */
    public function toArray(Request $request): array
    {
        return [
            'id'          => $this->id,
            'code'        => $this->code,
            'description' => $this->description,
            'category'    => $this->category,
        ];
    }
}
