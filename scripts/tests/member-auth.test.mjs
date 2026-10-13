import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createSign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { memberAdminAuth, verifyMember } from '../../src/lib/server/memberAuth.mjs';
process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID='watchlist-test-project';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
// Seed only the SDK's certificate cache with a fixture public key. The real
// Admin SDK still verifies RS256 signatures and project-bound token claims.
const keys=memberAdminAuth().idTokenVerifier.signatureVerifier.keyFetcher;
keys.publicKeys={'fixture-key':publicKey.export({type:'spki',format:'pem'})};keys.publicKeysExpireAt=Date.now()+3600000;
const now=Math.floor(Date.now()/1000);
function token(overrides={},headerOverrides={},key=privateKey) {
    const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
    const header=encode({alg:'RS256',kid:'fixture-key',...headerOverrides});
    const body=encode({aud:'watchlist-test-project',iss:'https://securetoken.google.com/watchlist-test-project',sub:'member-A',iat:now-10,auth_time:now-20,exp:now+3600,...overrides});
    const payload=`${header}.${body}`;return `Bearer ${payload}.${createSign('RSA-SHA256').update(payload).sign(key,'base64url')}`;
}
test('real Firebase Admin SDK accepts a valid project-bound signed ID token',async()=>assert.equal(await verifyMember(token()),'member-A'));
test('real signature and audience checks reject tampering, other projects and invalid claims',async()=>{
    const other=generateKeyPairSync('rsa',{modulusLength:2048}).privateKey;
    for(const value of [token({}, {},other),token({aud:'other-project'}),token({iss:'https://securetoken.google.com/other'}),token({exp:now-500}),token({iat:now+3600}),token({auth_time:now+3600}),token({sub:''}),token({}, {alg:'none'}),'Bearer broken','',null]) await assert.rejects(()=>verifyMember(value),{code:'sign_in_required',status:401});
});
test('an accidental Firebase emulator environment never bypasses signature verification',async()=>{
    process.env.FIREBASE_AUTH_EMULATOR_HOST='localhost:9099';try{await assert.rejects(()=>verifyMember(token()),{code:'member_not_configured',status:503});}finally{delete process.env.FIREBASE_AUTH_EMULATOR_HOST;}
});

test('server auth loads when the runtime disables require(ESM), as on Vercel',()=>{
    assert.doesNotThrow(()=>execFileSync(process.execPath,['--no-experimental-require-module','-e',"require('firebase-admin/auth')"],{stdio:'pipe'}));
});
