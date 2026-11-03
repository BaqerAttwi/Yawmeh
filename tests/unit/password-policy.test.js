import test from 'node:test';
import assert from 'node:assert/strict';
import {newPasswordSchema} from '../../shared/password-policy.js';
import {userSchema} from '../../server/src/modules/auth/auth.js';

test('new passwords accept 8 and 24 characters and reject values outside that range',()=>{
 for(const length of [8,24])assert.equal(newPasswordSchema.safeParse('a'.repeat(length)).success,true);
 for(const length of [0,7,25,128])assert.equal(newPasswordSchema.safeParse('a'.repeat(length)).success,false);
 const user={name:'Member',email:'member@example.com',permissions:['tasks']};
 assert.equal(userSchema.safeParse({...user,password:'a'.repeat(8)}).success,true);
 assert.equal(userSchema.safeParse({...user,password:'a'.repeat(25)}).success,false);
 assert.equal(userSchema.safeParse(user).success,true,'password setup invitations remain supported');
});
