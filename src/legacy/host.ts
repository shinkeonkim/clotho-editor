// Host-supplied resources.
//
// The Studio grew inside a blog, so a few of its paths were that blog's: the admin API
// route, the uploads directory. A package cannot assume any of them. Each is now a
// setting with the original value as the default, so an existing host keeps working
// without changing anything and a new one is not stuck with someone else's layout.

let placeholderUrl = '/uploads/placeholder.png';

export interface HostOptions {
  /** Image used when inserting a placeholder image element. */
  readonly placeholderImageUrl?: string;
}

export function configureHost(options: HostOptions): void {
  if (options.placeholderImageUrl) placeholderUrl = options.placeholderImageUrl;
}

export function placeholderImageUrl(): string {
  return placeholderUrl;
}
