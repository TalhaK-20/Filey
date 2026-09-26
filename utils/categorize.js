const MIME_CATEGORY_MAP = [
  { prefix: 'image/', category: 'Images' },
  { prefix: 'audio/', category: 'Audio' },
  { prefix: 'video/', category: 'Video' },
];

const EXACT_MIME_MAP = {
  'application/pdf': 'Documents',
  'application/msword': 'Documents',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Documents',
  'application/vnd.ms-excel': 'Documents',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Documents',
  'application/vnd.ms-powerpoint': 'Documents',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'Documents',
  'text/plain': 'Documents',
  'text/csv': 'Documents',
  'application/rtf': 'Documents',

  'application/zip': 'Archives',
  'application/x-7z-compressed': 'Archives',
  'application/x-rar-compressed': 'Archives',
  'application/vnd.rar': 'Archives',
  'application/x-tar': 'Archives',
  'application/gzip': 'Archives',
  'application/x-gzip': 'Archives',

  'application/vnd.android.package-archive': 'Software',
  'application/x-msdownload': 'Software',
  'application/x-executable': 'Software',
  'application/vnd.debian.binary-package': 'Software',
};

const EXTENSION_CATEGORY_MAP = {
  pdf: 'Documents', doc: 'Documents', docx: 'Documents', xls: 'Documents', xlsx: 'Documents',
  ppt: 'Documents', pptx: 'Documents', txt: 'Documents', csv: 'Documents', rtf: 'Documents', odt: 'Documents',
  jpg: 'Images', jpeg: 'Images', png: 'Images', gif: 'Images', webp: 'Images', svg: 'Images', bmp: 'Images',
  mp3: 'Audio', wav: 'Audio', flac: 'Audio', aac: 'Audio', ogg: 'Audio', m4a: 'Audio',
  mp4: 'Video', mkv: 'Video', avi: 'Video', mov: 'Video', webm: 'Video', flv: 'Video',
  zip: 'Archives', rar: 'Archives', '7z': 'Archives', tar: 'Archives', gz: 'Archives',
  exe: 'Software', msi: 'Software', apk: 'Software', deb: 'Software', dmg: 'Software',
};

function categoryFromMime(mimeType, extension) {
  if (EXACT_MIME_MAP[mimeType]) return EXACT_MIME_MAP[mimeType];

  const prefixMatch = MIME_CATEGORY_MAP.find((entry) => mimeType.startsWith(entry.prefix));
  if (prefixMatch) return prefixMatch.category;

  const ext = (extension || '').replace(/^\./, '').toLowerCase();
  if (EXTENSION_CATEGORY_MAP[ext]) return EXTENSION_CATEGORY_MAP[ext];

  return 'Other';
}

module.exports = { categoryFromMime, EXTENSION_CATEGORY_MAP };
