const getYoutubeId = (url: string) => {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);

  return match && match[2].length === 11 ? match[2] : null;
};

export const parseUrlToEmbed = (url: string) => {
  const id = getYoutubeId(url);
  if (id) {
    return `https://www.youtube.com/embed/${id}`;
  }
  return url;
};
