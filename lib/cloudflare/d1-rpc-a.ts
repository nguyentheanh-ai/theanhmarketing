// All Supabase A RPCs available on D1. Functions used by the app but absent
// from the source database (Zalo ZNS) are intentionally not registered, so
// they fail exactly like PostgREST does today (PGRST202).
import type {ShimRpc} from './d1-postgrest';
import {jobRpcs} from './d1-rpc-a-jobs';
import {crmRpcs} from './d1-rpc-a-crm';
import {lmsRpcs} from './d1-rpc-a-lms';
import {supportRpcs} from './d1-rpc-a-support';
import {provisioningRpcs} from './d1-rpc-a-provisioning';
export const supabaseARpcs:Record<string,ShimRpc>={...jobRpcs,...crmRpcs,...lmsRpcs,...supportRpcs,...provisioningRpcs};
