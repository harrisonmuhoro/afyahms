<?php

namespace App\Models\Profiles;

use Illuminate\Database\Eloquent\Model;
use App\Models\User;
use App\Modules\Tenancy\Models\Branch;

class RecordsOfficerProfile extends Model
{
    protected $table = 'records_officer_profiles';
    protected $fillable = ['user_id', 'branch_id'];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function branch()
    {
        return $this->belongsTo(Branch::class);
    }
}