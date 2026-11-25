import {z} from 'zod';
import {PlannerError} from '../../../shared/planner.js';

const syncSchema=z.object({id:z.uuid(),account:z.string().regex(/^[1-9]\d*$/)}).optional();

export function offlineSyncId(req){
  const sync=syncSchema.parse(req.body.offline_sync);
  if(sync&&sync.account!==String(req.user.id)){
    const error=new PlannerError('Sign in to the account that created this record.',409);
    error.code='OFFLINE_ACCOUNT_MISMATCH';
    throw error;
  }
  return sync?.id;
}

export async function existingOfflineRecord(connection,table,userId,syncId){
  if(!syncId)return;
  const [[record]]=await connection.query(`SELECT id FROM ${table} WHERE user_id=? AND offline_sync_id=?`,[userId,syncId]);
  return record;
}
