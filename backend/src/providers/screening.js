// Mock screening provider. Replace with OpenSanctions/WorldCheck integrations.
export async function runScreening({ destination_country, end_user_name }){
  const name = (end_user_name||'').toLowerCase();
  const flagged = /(defense|military|arms|missile)/.test(name);
  return {
    screen_result: flagged ? 'potential_hit' : 'yes_clear',
    evidence: flagged ? 'Automated rule: keyword match' : 'Automated rule: no flags'
  };
}
