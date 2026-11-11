import {z} from 'zod';
import {requireAccess} from '../auth/auth.js';
import {today} from '../../../../shared/domain.js';
import {checkVoid} from '../../../../shared/insights.js';
export function mountInsights(app,db,transaction){
  const title = z.object({title:z.string().trim().min(1).max(160)}).strict();
  for (const table of ['tasks','entries','subscriptions','budgets','goals','items']) {
    app.patch(`/api/${table}/:id/title`,requireAccess(table==='tasks'?'tasks':'money'),async(req,res)=>{
      const value=title.parse(req.body);
      const active=table==='entries'?' AND voided_on IS NULL':table==='tasks'?' AND cancelled=0':'';
      const [result]=await db.query(`UPDATE ${table} SET title=? WHERE id=? AND user_id=?${active}`,[value.title,req.params.id,req.user.id]);
      if(!result.affectedRows)return res.status(404).json({error:'Active record not found.'});
      res.json({ok:true});
    });
  }
  for(const [table,field,permission,schema] of [
    ['tasks','estimate_minutes','tasks',z.number().int().min(0).max(1440)],
    ['subscriptions','rarely_used','money',z.boolean()],
    ['goals','monthly_amount','money',z.number().min(0).max(999999999).refine(n=>Math.abs(n*100-Math.round(n*100))<0.00001)]
  ])app.patch(`/api/${table}/:id/${field}`,requireAccess(permission),async(req,res)=>{
    const value=z.object({[field]:schema}).strict().parse(req.body)[field];
    const [r]=await db.query(`UPDATE ${table} SET ${field}=? WHERE id=? AND user_id=?`,[value,req.params.id,req.user.id]);
    if(!r.affectedRows)return res.status(404).json({error:'Record not found.'});res.json({ok:true});
  });
  app.post('/api/entries/:id/void',requireAccess('money'),async(req,res)=>{
    const {reason}=z.object({reason:z.string().trim().min(1).max(500)}).strict().parse(req.body);
    await transaction(req.user.id,async connection=>{
      const [entries]=await connection.query('SELECT * FROM entries WHERE user_id=?',[req.user.id]);
      const [moves]=await connection.query('SELECT * FROM goal_moves WHERE user_id=?',[req.user.id]);
      const entry=checkVoid(entries,moves,req.params.id,reason);
      await connection.query('UPDATE entries SET voided_on=?,void_reason=? WHERE id=? AND user_id=?',[today(process.env.TIMEZONE||'Asia/Beirut'),reason,entry.id,req.user.id]);
    });res.json({ok:true});
  });
}
