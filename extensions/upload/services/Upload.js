"use strict";
const _ = require("lodash");

module.exports = {
  async uploadFileAndPersist(fileData) {
    const config = strapi.plugins.upload.config;
    const fileFormats = {};
    const {
      getDimensions,
      generateThumbnail,
      generateResponsiveFormats,
    } = strapi.plugins.upload.services["image-manipulation"];

    await strapi.plugins.upload.provider.upload(fileData);

    const thumbnailFile = await generateThumbnail(fileData);
    if (thumbnailFile) {
      await strapi.plugins.upload.provider.upload(thumbnailFile);
      delete thumbnailFile.buffer;
      fileFormats["thumbnail"] = [thumbnailFile];
    }

    const formats = await generateResponsiveFormats(fileData);
    if (Array.isArray(formats) && formats.length > 0) {
      for (const format of formats) {
        if (!format || !(Array.isArray(format) && format.length > 0)) continue;
        for (const { key, file } of format) {
          await strapi.plugins.upload.provider.upload(file);
          delete file.buffer;

          // "key" is here as "small", "medium", "large"...
          if (!(key in fileFormats)) {
            fileFormats[key] = [];
          }

          // "file" is created format. "png", "jpeg", "webp"...
          fileFormats[key].push(file);
        }
      }
    }

    // Format generation of all size's has done.
    _.set(fileData, ["formats"], fileFormats);

    const { width, height } = await getDimensions(fileData.buffer);
    delete fileData.buffer;
    _.assign(fileData, {
      provider: config.provider,
      width,
      height,
    });
    return this.add(fileData);
  },
};
