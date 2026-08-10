// npm dist-tag policy for releases (fail-closed):
//   x.y.z        -> "latest" (stable)
//   x.y.z-rc.N   -> "rc"     (release candidate)
//   anything else (alpha/beta/other prerelease suffixes) -> throw, so an
//   accidental prerelease can never silently land on a dist-tag.
export function distTagForVersion(version) {
  if (/^\d+\.\d+\.\d+$/.test(version)) return "latest";
  if (/^\d+\.\d+\.\d+-rc\.\d+$/.test(version)) return "rc";
  throw new Error(
    `unsupported release version "${version}": only stable x.y.z (dist-tag latest) ` +
      `and x.y.z-rc.N (dist-tag rc) are allowed; other prerelease suffixes fail closed`
  );
}
