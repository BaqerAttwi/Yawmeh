import React from 'react';

export function Character({avatar,animated=false}) {
 const id=['sage','nova','pip'].includes(avatar.id)?avatar.id:'sage';
 return <i aria-hidden="true" style={{backgroundImage:`url(/characters/${id}-wave.png)`}} className={'companion-avatar companion-character waving-character '+(animated?'is-animated':'')}/>;
}
