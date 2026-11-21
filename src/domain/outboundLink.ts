export function safeHttpsLink(
  value: string | null | undefined,
  hostname?: RegExp
) {
  const link = value?.trim();
  if (!link || link.length > 2048 || !/^https:\/\//i.test(link)) return null;
  try {
    const url = new URL(link);
    return url.username ||
      url.password ||
      (hostname && (url.port || !hostname.test(url.hostname)))
      ? null
      : link;
  } catch {
    return null;
  }
}

export const githubHost = /^(?:www\.)?github\.com$/;
