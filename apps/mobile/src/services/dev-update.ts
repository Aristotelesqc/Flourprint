/**
 * Loading the latest dev build (ADR 0016). The dev APK shows the `dev` site, which a WebView kept
 * in memory or cached may not have reloaded since the last deployment. Release builds never offer
 * this: they only change by installing a new APK.
 */

export interface DeployedBuild {
  readonly build: string;
  readonly label: string;
}

/** Whether this build offers to load the latest deployment: every build but a release. */
export const offersDevUpdate = (channel: string): boolean => channel !== 'release';

/** The build deployed at this origin now, bypassing every cache; undefined if unreachable. */
export const fetchDeployedBuild = async (
  fetcher: typeof fetch = fetch,
): Promise<DeployedBuild | undefined> => {
  try {
    const response = await fetcher(`/build.json?t=${Date.now()}`, { cache: 'no-store' });
    if (!response.ok) return undefined;
    const value: unknown = await response.json();
    if (
      typeof value === 'object' &&
      value !== null &&
      'build' in value &&
      'label' in value &&
      typeof value.build === 'string' &&
      typeof value.label === 'string'
    ) {
      return { build: value.build, label: value.label };
    }
    return undefined;
  } catch {
    return undefined;
  }
};
