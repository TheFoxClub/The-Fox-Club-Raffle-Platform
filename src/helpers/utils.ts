export const loadImageSrcFromFile = async (file): Promise<string> => {
  return new Promise((resolve, reject) => {
    if (FileReader && file) {
      var fr = new FileReader();

      fr.onload = () => resolve(fr.result.toString());

      fr.onerror = (err) => reject(err);

      fr.readAsDataURL(file);
    }
  });
};
