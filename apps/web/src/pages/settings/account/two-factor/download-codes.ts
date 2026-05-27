/**
 * Trigger a browser download of the recovery code list as a UTF-8 text
 * file. Pulled out so both the setup and regenerate flows share the
 * filename and MIME conventions.
 */
export const downloadRecoveryCodes = (codes: string[]) => {
  const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'usertour-2fa-recovery-codes.txt';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
