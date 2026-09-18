import { Router } from "express";
import jwt from "jsonwebtoken";
import { pool, countUsers } from "../db.js";
import { setAuthCookie } from "../auth.js";
import { getClient, isOidcEnabled, getProviderName, getScopes, generators } from "../oidc.js";

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const TXN_COOKIE = "oidc_txn";

router.get("/config", (req, res) => {
  res.json({ enabled: isOidcEnabled(), providerName: getProviderName() });
});

router.get("/login", (req, res) => {
  const client = getClient();
  if (!client) return res.status(404).json({ error: "SSO is not configured" });

  const state = generators.state();
  const nonce = generators.nonce();
  const codeVerifier = generators.codeVerifier();
  const codeChallenge = generators.codeChallenge(codeVerifier);

  const txn = jwt.sign({ state, nonce, codeVerifier }, JWT_SECRET, { expiresIn: "10m" });
  res.cookie(TXN_COOKIE, txn, { httpOnly: true, sameSite: "lax", maxAge: 10 * 60 * 1000 });

  const url = client.authorizationUrl({
    scope: getScopes(),
    state,
    nonce,
    code_challenge: codeChallenge,
    code_challenge_method: "S256",
  });
  res.redirect(url);
});

router.get("/callback", async (req, res) => {
  const client = getClient();
  if (!client) return res.status(404).json({ error: "SSO is not configured" });

  const txnToken = req.cookies?.[TXN_COOKIE];
  res.clearCookie(TXN_COOKIE);
  if (!txnToken) {
    return res.redirect("/?oidc_error=" + encodeURIComponent("Sign-in session expired. Please try again."));
  }

  let txn;
  try {
    txn = jwt.verify(txnToken, JWT_SECRET);
  } catch {
    return res.redirect("/?oidc_error=" + encodeURIComponent("Sign-in session expired. Please try again."));
  }

  try {
    const params = client.callbackParams(req);
    const redirectUri = client.metadata.redirect_uris[0];
    const tokenSet = await client.callback(redirectUri, params, {
      state: txn.state,
      nonce: txn.nonce,
      code_verifier: txn.codeVerifier,
    });
    const claims = tokenSet.claims();

    const { rows: existingRows } = await pool.query(
      "SELECT id, email, first_name, last_name, is_admin FROM users WHERE oidc_sub = $1",
      [claims.sub]
    );
    let user = existingRows[0];

    if (!user) {
      if (!claims.email) {
        return res.redirect(
          "/?oidc_error=" + encodeURIComponent("Your identity provider didn't share an email address.")
        );
      }
      const email = claims.email.toLowerCase();
      const firstName = claims.given_name || null;
      const lastName = claims.family_name || null;
      const isAdmin = (await countUsers()) === 0;

      try {
        const { rows: inserted } = await pool.query(
          "INSERT INTO users (email, first_name, last_name, password_hash, is_admin, oidc_sub, oidc_issuer) VALUES ($1, $2, $3, NULL, $4, $5, $6) RETURNING id, email, first_name, last_name, is_admin",
          [email, firstName, lastName, isAdmin, claims.sub, client.issuer.issuer]
        );
        user = inserted[0];
      } catch (err) {
        if (err.code === "23505") {
          return res.redirect(
            "/?oidc_error=" +
              encodeURIComponent("An account with this email already exists. Ask an admin to link your SSO login.")
          );
        }
        throw err;
      }
    }

    setAuthCookie(res, user);
    res.redirect("/");
  } catch (err) {
    console.error("OIDC callback error:", err);
    res.redirect("/?oidc_error=" + encodeURIComponent("Sign-in failed. Please try again."));
  }
});

export default router;
