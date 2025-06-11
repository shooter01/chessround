function formatMessage(template, payload) {
  return template.replace(/{{(.*?)}}/g, (_, key) => {
    const keys = key.trim().split('.');
    let value = payload;
    for (const k of keys) {
      value = value?.[k];
      if (value === undefined || value === null) return `{{${key}}}`;
    }
    return String(value); // Приводим к строке
  });
}

module.exports = {
  formatMessage,
};
