export const isImageAvatar = (value?: string | null) =>
    !!value && /^(https?:\/\/|data:image\/|blob:|\/)/i.test(value);
