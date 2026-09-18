/** Keep existing Web routes while Desktop uses the shared API carrier. */
export function resourcePath(path: string): string {
  return typeof location !== 'undefined' && location.protocol === 'dsh-app:' ? `/api${path}` : path
}
