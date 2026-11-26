const prefix=account=>'yawmeh:receipt-review:'+account+':';
const key=(account,id)=>prefix(account)+id;

export function receiptDrafts(account){
 try{
  return Object.keys(localStorage).filter(name=>name.startsWith(prefix(account))).flatMap(name=>{
   try{
    const draft=JSON.parse(localStorage.getItem(name));
    return draft?.initial?.receipt&&name===key(account,draft.id)?[draft]:[];
   }catch{return [];}
  }).sort((a,b)=>b.createdAt-a.createdAt);
 }catch{return [];}
}

export function storeReceiptDraft(account,initial,language){
 const draft={id:crypto.randomUUID(),createdAt:Date.now(),language,initial};
 localStorage.setItem(key(account,draft.id),JSON.stringify(draft));
 return draft;
}

export function removeReceiptDraft(account,id){
 localStorage.removeItem(key(account,id));
}

export function needsCategoryReview(entry){
 return entry.type==='expense'&&!entry.voided_on&&!entry.reviewed&&!!entry.category_review_requested&&entry.category==='Other';
}
