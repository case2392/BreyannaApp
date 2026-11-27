// Turn a raw email/text provider error into a plain-language explanation of
// what went wrong and what to do. Shared by the campaign results page and the
// "Email & text setup" check on the Messages page.

export function deliveryHint(error: string | null | undefined): string | null {
  if (!error) return null;
  const e = error;

  // ---- Texting (Twilio) ----
  if (/Not a valid phone number/i.test(e))
    return "This number is missing digits or has a typo. Fix it on the member's profile.";
  if (/\b21211\b/.test(e))
    return "Twilio says this isn't a valid phone number. Check it on the member's profile.";
  if (/\b21608\b/.test(e))
    return "Your Twilio account is still a free trial, which can only text numbers you've verified. Upgrade the Twilio account (add a payment method) to text everyone.";
  if (/\b21610\b/.test(e))
    return "This person replied STOP to an earlier text, so carriers block more texts to them. They can reply START to opt back in.";
  if (/\b2160[69]\b|\b21659\b|\b21212\b/.test(e))
    return "The “from” number isn't a Twilio texting number on this account. Check TWILIO_FROM_NUMBER in Vercel.";
  if (/\b20003\b|\b401\b.*twilio|twilio.*\b401\b/i.test(e))
    return "Twilio rejected the login. Re-copy the Account SID and Auth Token from Twilio into Vercel.";
  if (/\b30034\b/.test(e))
    return "Carriers blocked this text because the number isn't registered for business texting (A2P 10DLC). Finish registration in Twilio.";
  if (/\b30007\b/.test(e))
    return "The carrier filtered this text as possible spam. Registered numbers and personal-sounding messages help.";

  // ---- Email (Resend) ----
  if (/\b429\b|rate limit|too many/i.test(e))
    return "Sent too fast for the email provider's limit. Try sending again.";
  if (/testing emails|only send testing|verify a domain|not verified|domain is not verified/i.test(e))
    return "Emails are going out from Resend's test address, which can only email the Resend account owner. Set RESEND_FROM in Vercel to an address on your verified domain (e.g. Dwell Studio <hello@dwellstudiolnk.com>).";
  if (/\b403\b/.test(e))
    return "The email provider refused the send — usually the “from” address isn't on a verified domain. Check RESEND_FROM in Vercel.";
  if (/\b401\b|api key/i.test(e))
    return "The email provider rejected the API key. Re-copy RESEND_API_KEY from Resend into Vercel.";
  if (/\b422\b|invalid|not a valid/i.test(e))
    return "The email address looks invalid. Fix it on the member's profile.";
  return null;
}
