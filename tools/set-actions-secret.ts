// Sets a GitHub Actions secret (libsodium sealed box, as the API requires).
//   bun run tools/set-actions-secret.ts <owner/repo> <SECRET_NAME>
// Token comes from Git Credential Manager and is also used as the secret
// value (for private-repo checkout tokens).
import sodium from "libsodium-wrappers";

const [repo, secretName] = [process.argv[2], process.argv[3]];
if (!repo || !secretName) {
  console.error("usage: bun run set-actions-secret.ts <owner/repo> <SECRET_NAME>");
  process.exit(2);
}

const cred = Bun.spawnSync(["git", "credential", "fill"], {
  stdin: Buffer.from("protocol=https\nhost=github.com\n\n"),
});
const token = cred.stdout
  .toString()
  .split("\n")
  .find((l) => l.startsWith("password="))
  ?.slice(9)
  .trim();
if (!token) {
  console.error("no token from credential manager");
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  Accept: "application/vnd.github+json",
  "X-GitHub-Api-Version": "2022-11-28",
};

const keyResp = await fetch(`https://api.github.com/repos/${repo}/actions/secrets/public-key`, {
  headers,
});
if (!keyResp.ok) {
  console.error(`public-key fetch failed: ${keyResp.status} ${await keyResp.text()}`);
  process.exit(1);
}
const { key, key_id } = (await keyResp.json()) as { key: string; key_id: string };

await sodium.ready;
const sealed = sodium.crypto_box_seal(
  sodium.from_string(token),
  sodium.from_base64(key, sodium.base64_variants.ORIGINAL),
);
const encrypted_value = sodium.to_base64(sealed, sodium.base64_variants.ORIGINAL);

const putResp = await fetch(
  `https://api.github.com/repos/${repo}/actions/secrets/${secretName}`,
  {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify({ encrypted_value, key_id }),
  },
);

console.log(`PUT secret ${secretName} on ${repo}: ${putResp.status}`);
process.exit(putResp.status === 201 || putResp.status === 204 ? 0 : 1);
