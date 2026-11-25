import { keepHomeFirst } from '@/utils/home-first';

/** Back on home only ever offers to leave: home stands on the app's first history entry. */
export default defineNuxtPlugin(() => keepHomeFirst(useRouter()));
