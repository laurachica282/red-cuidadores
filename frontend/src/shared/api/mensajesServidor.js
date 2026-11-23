// El backend responde siempre en español ({ error }, { mensaje }, { motivo }). Aquí se traducen esos textos
// al idioma de la interfaz (el que region marca en <html lang>). Si un texto no está, se muestra tal cual.
//   EXACTOS:  texto fijo del servidor -> { en, pt }
//   PATRONES: textos con partes variables (números, estados…). `en`/`pt` es una plantilla con $1, $2…
//             o una función (...grupos) => texto cuando la parte variable también hay que traducirla.
// Al agregar un mensaje nuevo en el backend, agréguelo aquí con el mismo texto exacto.

const EXACTOS = {
  // ---------- Generales ----------
  'Algo salió mal. Inténtalo de nuevo.': { en: 'Something went wrong. Please try again.', pt: 'Algo deu errado. Tente novamente.' },
  'No se pudo completar la operación': { en: 'The operation could not be completed', pt: 'Não foi possível concluir a operação' },
  'Ruta no encontrada': { en: 'Route not found', pt: 'Rota não encontrada' },
  'Archivo no encontrado': { en: 'File not found', pt: 'Arquivo não encontrado' },
  'No se pudo conectar a la base': { en: 'Could not connect to the database', pt: 'Não foi possível conectar ao banco de dados' },
  'Nombre de archivo no válido': { en: 'Invalid file name', pt: 'Nome de arquivo inválido' },
  'No se pudo guardar el archivo. Inténtalo de nuevo.': { en: 'The file could not be saved. Please try again.', pt: 'Não foi possível salvar o arquivo. Tente novamente.' },
  'No tienes permiso para esto': { en: 'You don’t have permission to do this', pt: 'Você não tem permissão para isso' },
  'Solo un administrador puede hacer esto': { en: 'Only an administrator can do this', pt: 'Só um administrador pode fazer isso' },
  'Faltan datos': { en: 'Some information is missing', pt: 'Faltam dados' },

  // ---------- Sesión ----------
  'Debes iniciar sesión': { en: 'You need to sign in', pt: 'Você precisa entrar' },
  'Tu sesión no es válida o venció': { en: 'Your session is invalid or has expired', pt: 'Sua sessão é inválida ou expirou' },
  'Tu sesión se cerró. Inicia sesión de nuevo.': { en: 'Your session was closed. Please sign in again.', pt: 'Sua sessão foi encerrada. Entre novamente.' },
  'No se pudo validar la sesión': { en: 'The session could not be validated', pt: 'Não foi possível validar a sessão' },
  'Sesión requerida': { en: 'Sign-in required', pt: 'É preciso entrar' },
  'Token sin id': { en: 'Invalid session token', pt: 'Token de sessão inválido' },
  'Sesión inválida o vencida': { en: 'Invalid or expired session', pt: 'Sessão inválida ou expirada' },

  // ---------- Auth: registro, login y códigos ----------
  'El código venció. Inicia sesión de nuevo.': { en: 'The code expired. Please sign in again.', pt: 'O código expirou. Entre novamente.' },
  'Demasiados intentos. Pide un código nuevo.': { en: 'Too many attempts. Request a new code.', pt: 'Muitas tentativas. Peça um código novo.' },
  'Demasiados intentos. Pide un código nuevo': { en: 'Too many attempts. Request a new code', pt: 'Muitas tentativas. Peça um código novo' },
  'El código venció. Pide uno nuevo.': { en: 'The code expired. Request a new one.', pt: 'O código expirou. Peça um novo.' },
  'Escribe el código de 6 dígitos': { en: 'Enter the 6-digit code', pt: 'Digite o código de 6 dígitos' },
  'Tipo de cuenta no válido': { en: 'Invalid account type', pt: 'Tipo de conta inválido' },
  'La contraseña debe tener mínimo 8 caracteres, una mayúscula y un número': {
    en: 'The password must have at least 8 characters, one uppercase letter and one number',
    pt: 'A senha deve ter no mínimo 8 caracteres, uma letra maiúscula e um número',
  },
  'Ese correo ya está registrado': { en: 'That email is already registered', pt: 'Esse e-mail já está cadastrado' },
  'Ese correo ya está registrado. Inicia sesión con tu contraseña.': {
    en: 'That email is already registered. Sign in with your password.',
    pt: 'Esse e-mail já está cadastrado. Entre com sua senha.',
  },
  'No se pudo crear la cuenta': { en: 'The account could not be created', pt: 'Não foi possível criar a conta' },
  'El código es incorrecto o venció': { en: 'The code is incorrect or has expired', pt: 'O código está incorreto ou expirou' },
  'No se pudo verificar el correo': { en: 'The email could not be verified', pt: 'Não foi possível verificar o e-mail' },
  'Falta el correo': { en: 'The email is missing', pt: 'Falta o e-mail' },
  'No se pudo enviar el código': { en: 'The code could not be sent', pt: 'Não foi possível enviar o código' },
  'Escribe tu correo y tu contraseña': { en: 'Enter your email and password', pt: 'Digite seu e-mail e sua senha' },
  'Correo o contraseña incorrectos': { en: 'Incorrect email or password', pt: 'E-mail ou senha incorretos' },
  'No se pudo iniciar sesión': { en: 'Could not sign in', pt: 'Não foi possível entrar' },
  'El inicio con Google no está disponible': { en: 'Sign-in with Google is not available', pt: 'O login com Google não está disponível' },
  'Falta la credencial de Google': { en: 'The Google credential is missing', pt: 'Falta a credencial do Google' },
  'No pudimos validar tu cuenta de Google': { en: 'We couldn’t validate your Google account', pt: 'Não conseguimos validar sua conta do Google' },
  'Tu cuenta de Google no tiene el correo verificado': { en: 'Your Google account’s email is not verified', pt: 'O e-mail da sua conta do Google não está verificado' },
  'No se pudo iniciar sesión con Google': { en: 'Could not sign in with Google', pt: 'Não foi possível entrar com o Google' },
  'El inicio con Microsoft no está disponible': { en: 'Sign-in with Microsoft is not available', pt: 'O login com Microsoft não está disponível' },
  'Falta la credencial de Microsoft': { en: 'The Microsoft credential is missing', pt: 'Falta a credencial da Microsoft' },
  'No pudimos validar tu cuenta de Microsoft': { en: 'We couldn’t validate your Microsoft account', pt: 'Não conseguimos validar sua conta da Microsoft' },
  'Microsoft no confirma que ese correo sea tuyo. Usa tu correo y contraseña.': {
    en: 'Microsoft doesn’t confirm that email is yours. Use your email and password.',
    pt: 'A Microsoft não confirma que esse e-mail é seu. Use seu e-mail e senha.',
  },
  'No se pudo iniciar sesión con Microsoft': { en: 'Could not sign in with Microsoft', pt: 'Não foi possível entrar com a Microsoft' },
  'No se pudo verificar el código': { en: 'The code could not be verified', pt: 'Não foi possível verificar o código' },
  'Escribe tu correo': { en: 'Enter your email', pt: 'Digite seu e-mail' },
  'Si el correo está registrado, recibirás un código en unos minutos.': {
    en: 'If the email is registered, you’ll receive a code in a few minutes.',
    pt: 'Se o e-mail estiver cadastrado, você receberá um código em alguns minutos.',
  },
  'El enlace venció. Pide un código nuevo.': { en: 'The link expired. Request a new code.', pt: 'O link expirou. Peça um código novo.' },
  'No se pudo cambiar la contraseña': { en: 'The password could not be changed', pt: 'Não foi possível alterar a senha' },
  'Tu cuenta ya tiene contraseña: úsala para confirmar': { en: 'Your account already has a password: use it to confirm', pt: 'Sua conta já tem senha: use-a para confirmar' },
  'La contraseña actual es incorrecta': { en: 'The current password is incorrect', pt: 'A senha atual está incorreta' },
  'La nueva contraseña no puede ser igual a la actual': { en: 'The new password can’t be the same as the current one', pt: 'A nova senha não pode ser igual à atual' },
  'La verificación en dos pasos es obligatoria para cuidadores': { en: 'Two-step verification is required for caregivers', pt: 'A verificação em duas etapas é obrigatória para cuidadores' },
  'La contraseña es incorrecta': { en: 'The password is incorrect', pt: 'A senha está incorreta' },
  'No pudimos identificar este dispositivo': { en: 'We couldn’t identify this device', pt: 'Não conseguimos identificar este dispositivo' },
  'No se pudo cambiar la verificación en dos pasos': { en: 'Two-step verification could not be changed', pt: 'Não foi possível alterar a verificação em duas etapas' },
  'No se pudo cerrar la sesión': { en: 'Could not sign out', pt: 'Não foi possível encerrar a sessão' },
  'No se pudieron cargar tus sesiones': { en: 'Your sessions could not be loaded', pt: 'Não foi possível carregar suas sessões' },
  'No se pudieron cerrar las sesiones': { en: 'The sessions could not be closed', pt: 'Não foi possível encerrar as sessões' },
  'No encontramos esa sesión': { en: 'We couldn’t find that session', pt: 'Não encontramos essa sessão' },
  'Esta cuenta está desactivada': { en: 'This account is deactivated', pt: 'Esta conta está desativada' },
  'Debes verificar tu correo para ingresar': { en: 'You must verify your email to sign in', pt: 'Você precisa verificar seu e-mail para entrar' },

  // ---------- Cuenta ----------
  'Demasiados intentos. Espera un momento e inténtalo de nuevo': { en: 'Too many attempts. Wait a moment and try again', pt: 'Muitas tentativas. Aguarde um momento e tente novamente' },
  'Foto no encontrada': { en: 'Photo not found', pt: 'Foto não encontrada' },
  'El correo se cambia desde "Cambiar correo", con verificación': {
    en: 'The email is changed from "Change email", with verification',
    pt: 'O e-mail é alterado em "Alterar e-mail", com verificação',
  },
  'Elige una foto': { en: 'Choose a photo', pt: 'Escolha uma foto' },
  'No se pudo leer la foto': { en: 'The photo could not be read', pt: 'Não foi possível ler a foto' },
  'La foto debe ser JPG, PNG o WEBP': { en: 'The photo must be JPG, PNG or WEBP', pt: 'A foto deve ser JPG, PNG ou WEBP' },
  'Las reseñas estarán disponibles cuando el módulo de reservas esté activo': {
    en: 'Reviews will be available when the bookings module is active',
    pt: 'As avaliações estarão disponíveis quando o módulo de reservas estiver ativo',
  },
  'No pudimos enviar el correo. Inténtalo más tarde.': { en: 'We couldn’t send the email. Please try later.', pt: 'Não conseguimos enviar o e-mail. Tente mais tarde.' },
  'El código venció o no existe. Pide uno nuevo': { en: 'The code expired or doesn’t exist. Request a new one', pt: 'O código expirou ou não existe. Peça um novo' },
  'Código incorrecto. Pide un código nuevo': { en: 'Incorrect code. Request a new code', pt: 'Código incorreto. Peça um código novo' },
  'Esa cuenta no tiene historial de desactivación': { en: 'That account has no deactivation history', pt: 'Essa conta não tem histórico de desativação' },
  'Tu cuenta ya está desactivada': { en: 'Your account is already deactivated', pt: 'Sua conta já está desativada' },
  'La contraseña no es correcta': { en: 'The password is not correct', pt: 'A senha não está correta' },
  'No puedes desactivar la cuenta mientras tengas pendientes': { en: 'You can’t deactivate the account while you have pending items', pt: 'Você não pode desativar a conta enquanto tiver pendências' },
  'Eres el único administrador: nombra otro antes de desactivar tu cuenta': {
    en: 'You are the only administrator: appoint another one before deactivating your account',
    pt: 'Você é o único administrador: nomeie outro antes de desativar sua conta',
  },
  'Tu cuenta quedó desactivada. Tus datos se conservan.': { en: 'Your account has been deactivated. Your data is kept.', pt: 'Sua conta foi desativada. Seus dados são mantidos.' },
  'La cuenta ya estaba desactivada': { en: 'The account was already deactivated', pt: 'A conta já estava desativada' },
  'Si existe una cuenta desactivada con ese correo, te enviamos un código': {
    en: 'If a deactivated account exists with that email, we sent you a code',
    pt: 'Se existir uma conta desativada com esse e-mail, enviamos um código para você',
  },
  'El código es incorrecto o venció. Pide uno nuevo': { en: 'The code is incorrect or has expired. Request a new one', pt: 'O código está incorreto ou expirou. Peça um novo' },
  'Tu cuenta está activa de nuevo. Ya puedes iniciar sesión.': { en: 'Your account is active again. You can sign in now.', pt: 'Sua conta está ativa novamente. Você já pode entrar.' },
  'No encontramos tu cuenta': { en: 'We couldn’t find your account', pt: 'Não encontramos sua conta' },
  'Ese ya es tu correo actual': { en: 'That is already your current email', pt: 'Esse já é o seu e-mail atual' },
  'Te enviamos un código al correo nuevo': { en: 'We sent a code to the new email', pt: 'Enviamos um código para o novo e-mail' },
  'Tu correo se actualizó': { en: 'Your email was updated', pt: 'Seu e-mail foi atualizado' },
  'No encontramos esa reserva': { en: 'We couldn’t find that booking', pt: 'Não encontramos essa reserva' },
  'Ya calificaste esta reserva': { en: 'You already rated this booking', pt: 'Você já avaliou esta reserva' },
  'Podrás calificar cuando el servicio termine': { en: 'You can rate it once the service is over', pt: 'Você poderá avaliar quando o serviço terminar' },
  'Solo puedes calificar reservas completadas': { en: 'You can only rate completed bookings', pt: 'Você só pode avaliar reservas concluídas' },
  // Validaciones de cuenta (validacion.js)
  'Escribe un correo válido': { en: 'Enter a valid email', pt: 'Digite um e-mail válido' },
  'El correo es muy largo': { en: 'The email is too long', pt: 'O e-mail é muito longo' },
  'Escribe el código': { en: 'Enter the code', pt: 'Digite o código' },
  'El código tiene 6 dígitos': { en: 'The code has 6 digits', pt: 'O código tem 6 dígitos' },
  'Escribe tu contraseña': { en: 'Enter your password', pt: 'Digite sua senha' },
  'El teléfono solo lleva números, espacios o guiones': { en: 'The phone can only contain numbers, spaces or hyphens', pt: 'O telefone só pode ter números, espaços ou hífens' },
  'No hay nada que actualizar': { en: 'There is nothing to update', pt: 'Não há nada para atualizar' },
  'No hay preferencias para guardar': { en: 'There are no preferences to save', pt: 'Não há preferências para salvar' },
  'Ese idioma no está disponible': { en: 'That language is not available', pt: 'Esse idioma não está disponível' },
  'Ese país no está disponible': { en: 'That country is not available', pt: 'Esse país não está disponível' },
  'Esa moneda no está disponible': { en: 'That currency is not available', pt: 'Essa moeda não está disponível' },
  'Elige un idioma, un país o una moneda': { en: 'Choose a language, a country or a currency', pt: 'Escolha um idioma, um país ou uma moeda' },
  'Reserva no válida': { en: 'Invalid booking', pt: 'Reserva inválida' },
  'Elige de 1 a 5 estrellas': { en: 'Choose from 1 to 5 stars', pt: 'Escolha de 1 a 5 estrelas' },
  'Elige un motivo': { en: 'Choose a reason', pt: 'Escolha um motivo' },
  'El detalle admite máximo 500 caracteres': { en: 'The details allow up to 500 characters', pt: 'O detalhe permite no máximo 500 caracteres' },
  'Cuenta no válida': { en: 'Invalid account', pt: 'Conta inválida' },

  // ---------- Región ----------
  'No hay términos para ese país': { en: 'There are no terms for that country', pt: 'Não há termos para esse país' },
  'Idioma no disponible': { en: 'Language not available', pt: 'Idioma não disponível' },
  'Moneda no disponible': { en: 'Currency not available', pt: 'Moeda não disponível' },

  // ---------- Cuidadores ----------
  'No se pudieron recibir los archivos.': { en: 'The files could not be received.', pt: 'Não foi possível receber os arquivos.' },
  'Servicio no válido': { en: 'Invalid service', pt: 'Serviço inválido' },
  'Elige al menos un servicio con su precio': { en: 'Choose at least one service with its price', pt: 'Escolha pelo menos um serviço com seu preço' },
  'Elige al menos un tipo de mascota': { en: 'Choose at least one pet type', pt: 'Escolha pelo menos um tipo de pet' },
  'La descripción es muy larga (máximo 1000 caracteres)': { en: 'The description is too long (maximum 1000 characters)', pt: 'A descrição é muito longa (máximo de 1000 caracteres)' },
  'Elige al menos una foto': { en: 'Choose at least one photo', pt: 'Escolha pelo menos uma foto' },
  'Las fotos deben ser JPG, PNG o WEBP': { en: 'Photos must be JPG, PNG or WEBP', pt: 'As fotos devem ser JPG, PNG ou WEBP' },
  'Este cuidador no está disponible': { en: 'This caregiver is not available', pt: 'Este cuidador não está disponível' },
  'Sube tu documento, una selfie y tu certificado de antecedentes': {
    en: 'Upload your ID document, a selfie and your background check certificate',
    pt: 'Envie seu documento, uma selfie e sua certidão de antecedentes',
  },
  'Debes aceptar el tratamiento de tus datos personales': { en: 'You must accept the processing of your personal data', pt: 'Você precisa aceitar o tratamento dos seus dados pessoais' },
  'La selfie debe ser una imagen JPG, PNG o WEBP': { en: 'The selfie must be a JPG, PNG or WEBP image', pt: 'A selfie deve ser uma imagem JPG, PNG ou WEBP' },
  'El documento y los antecedentes deben ser imagen o PDF': { en: 'The ID document and background check must be an image or PDF', pt: 'O documento e os antecedentes devem ser imagem ou PDF' },
  'Ya tienes una verificación en revisión': { en: 'You already have a verification under review', pt: 'Você já tem uma verificação em análise' },
  'Tus antecedentes ya están aprobados y vigentes': { en: 'Your background check is already approved and valid', pt: 'Seus antecedentes já estão aprovados e válidos' },
  'No se pudo guardar tu verificación. Inténtalo de nuevo.': { en: 'Your verification could not be saved. Please try again.', pt: 'Não foi possível salvar sua verificação. Tente novamente.' },
  'No se pudo abrir el archivo': { en: 'The file could not be opened', pt: 'Não foi possível abrir o arquivo' },
  'Verificación no encontrada': { en: 'Verification not found', pt: 'Verificação não encontrada' },
  'Esta verificación ya fue revisada': { en: 'This verification has already been reviewed', pt: 'Esta verificação já foi analisada' },
  'Escribe el motivo del rechazo': { en: 'Write the reason for the rejection', pt: 'Escreva o motivo da recusa' },
  'Escribe el motivo de la suspensión': { en: 'Write the reason for the suspension', pt: 'Escreva o motivo da suspensão' },
  'Cuidador no encontrado': { en: 'Caregiver not found', pt: 'Cuidador não encontrado' },
  'Este cuidador ya está suspendido': { en: 'This caregiver is already suspended', pt: 'Este cuidador já está suspenso' },
  'No se pudo suspender al cuidador': { en: 'The caregiver could not be suspended', pt: 'Não foi possível suspender o cuidador' },

  // ---------- Búsqueda ----------
  'Elige la fecha': { en: 'Choose the date', pt: 'Escolha a data' },
  'La fecha de inicio ya pasó': { en: 'The start date has already passed', pt: 'A data de início já passou' },
  'La fecha de salida debe ser posterior a la de entrada': { en: 'The check-out date must be after the check-in date', pt: 'A data de saída deve ser posterior à de entrada' },
  'La fecha de fin no puede ser anterior a la de inicio': { en: 'The end date can’t be before the start date', pt: 'A data de término não pode ser anterior à de início' },
  'La hora de fin debe ser posterior a la de inicio': { en: 'The end time must be after the start time', pt: 'O horário de término deve ser posterior ao de início' },
  'La ubicación está incompleta': { en: 'The location is incomplete', pt: 'A localização está incompleta' },
  'La ubicación no es válida': { en: 'The location is not valid', pt: 'A localização não é válida' },
  'Tipo de mascota no válido': { en: 'Invalid pet type', pt: 'Tipo de pet inválido' },
  'Tipo de servicio no válido': { en: 'Invalid service type', pt: 'Tipo de serviço inválido' },
  'El precio debe ser un número positivo': { en: 'The price must be a positive number', pt: 'O preço deve ser um número positivo' },
  'El precio mínimo no puede ser mayor que el máximo': { en: 'The minimum price can’t be higher than the maximum', pt: 'O preço mínimo não pode ser maior que o máximo' },
  'No se pudo hacer la búsqueda': { en: 'The search could not be performed', pt: 'Não foi possível fazer a busca' },
  'No pudimos buscar la dirección. Inténtalo en un momento.': { en: 'We couldn’t look up the address. Try again in a moment.', pt: 'Não conseguimos buscar o endereço. Tente daqui a pouco.' },
  'No pudimos leer la dirección de ese punto.': { en: 'We couldn’t read the address of that point.', pt: 'Não conseguimos ler o endereço desse ponto.' },
  'No se pudo cargar el perfil': { en: 'The profile could not be loaded', pt: 'Não foi possível carregar o perfil' },

  // ---------- Mascotas ----------
  'El nombre es obligatorio': { en: 'Name is required', pt: 'O nome é obrigatório' },
  'Especie no válida': { en: 'Invalid species', pt: 'Espécie inválida' },
  'La edad (en meses) no es válida': { en: 'The age (in months) is not valid', pt: 'A idade (em meses) não é válida' },
  'El peso no es válido': { en: 'The weight is not valid', pt: 'O peso não é válido' },
  'No se pudo guardar la mascota': { en: 'The pet could not be saved', pt: 'Não foi possível salvar o pet' },
  'No se pudieron cargar las mascotas': { en: 'The pets could not be loaded', pt: 'Não foi possível carregar os pets' },
  'Mascota no encontrada': { en: 'Pet not found', pt: 'Pet não encontrado' },
  'Error al consultar la mascota': { en: 'Error loading the pet', pt: 'Erro ao consultar o pet' },
  'No se pudo actualizar la mascota': { en: 'The pet could not be updated', pt: 'Não foi possível atualizar o pet' },
  'No se pudo eliminar la mascota': { en: 'The pet could not be deleted', pt: 'Não foi possível excluir o pet' },
  'El valor estimado es obligatorio': { en: 'The estimated value is required', pt: 'O valor estimado é obrigatório' },
  'Debes adjuntar el comprobante': { en: 'You must attach the proof document', pt: 'Você precisa anexar o comprovante' },
  'No se pudo marcar la mascota como fina': { en: 'The pet could not be marked as purebred', pt: 'Não foi possível marcar o pet como de raça' },
  'Formato de archivo no permitido': { en: 'File format not allowed', pt: 'Formato de arquivo não permitido' },
  'El comprobante debe ser una imagen o un PDF': { en: 'The proof document must be an image or a PDF', pt: 'O comprovante deve ser uma imagem ou um PDF' },
  // HU-29: filtro del chat antes de pagar
  'Por tu seguridad, no puedes compartir teléfonos, correos ni enlaces externos antes de pagar. Cuando la reserva esté pagada podrás hacerlo.': {
    en: 'For your safety, you can’t share phone numbers, emails or external links before paying. Once the booking is paid you’ll be able to.',
    pt: 'Para sua segurança, você não pode compartilhar telefones, e-mails nem links externos antes de pagar. Quando a reserva estiver paga, você poderá fazer isso.',
  },

  // ---------- Pagos ----------
  'Escribe un correo de PayPal válido': { en: 'Enter a valid PayPal email', pt: 'Digite um e-mail do PayPal válido' },
  'Elige un banco': { en: 'Choose a bank', pt: 'Escolha um banco' },
  'El celular debe tener 10 dígitos y empezar por 3': { en: 'The mobile number must have 10 digits and start with 3', pt: 'O celular deve ter 10 dígitos e começar com 3' },
  'La CLABE debe tener 18 dígitos': { en: 'The CLABE must have 18 digits', pt: 'A CLABE deve ter 18 dígitos' },
  'Escribe tu nombre completo': { en: 'Enter your full name', pt: 'Digite seu nome completo' },
  'El móvil debe tener 9 dígitos y empezar por 6 o 7': { en: 'The mobile number must have 9 digits and start with 6 or 7', pt: 'O celular deve ter 9 dígitos e começar com 6 ou 7' },
  'El CPF debe tener 11 dígitos': { en: 'The CPF must have 11 digits', pt: 'O CPF deve ter 11 dígitos' },
  'Falta el nombre del país': { en: 'The country name is missing', pt: 'Falta o nome do país' },
  'Falta la pasarela': { en: 'The payment gateway is missing', pt: 'Falta o gateway de pagamento' },
  'La moneda debe ser un código de 3 letras, como COP': { en: 'The currency must be a 3-letter code, like COP', pt: 'A moeda deve ser um código de 3 letras, como COP' },
  'La comisión debe estar entre 0 y 100': { en: 'The commission must be between 0 and 100', pt: 'A comissão deve estar entre 0 e 100' },
  'Elige al menos un método de pago': { en: 'Choose at least one payment method', pt: 'Escolha pelo menos um método de pagamento' },
  'Hay un método de pago que no existe': { en: 'One of the payment methods doesn’t exist', pt: 'Há um método de pagamento que não existe' },
  'No hay pagos disponibles en ese país': { en: 'Payments are not available in that country', pt: 'Não há pagamentos disponíveis nesse país' },
  'El país debe ser un código de 2 letras, como CO': { en: 'The country must be a 2-letter code, like CO', pt: 'O país deve ser um código de 2 letras, como CO' },
  'Coordenadas no válidas': { en: 'Invalid coordinates', pt: 'Coordenadas inválidas' },
  'No pudimos saber en qué país estás': { en: 'We couldn’t tell which country you are in', pt: 'Não conseguimos saber em qual país você está' },
  'No pudimos detectar tu ubicación ahora. Inténtalo de nuevo.': { en: 'We couldn’t detect your location right now. Please try again.', pt: 'Não conseguimos detectar sua localização agora. Tente novamente.' },
  'Solo los viajeros pagan reservas': { en: 'Only travelers pay for bookings', pt: 'Só os viajantes pagam reservas' },
  'Reserva no encontrada': { en: 'Booking not found', pt: 'Reserva não encontrada' },
  'No se pudo procesar el pago': { en: 'The payment could not be processed', pt: 'Não foi possível processar o pagamento' },
  'No se pudieron cargar los pagos': { en: 'The payments could not be loaded', pt: 'Não foi possível carregar os pagamentos' },
  'No se pudieron cargar los movimientos': { en: 'The transactions could not be loaded', pt: 'Não foi possível carregar as movimentações' },
  'El número de la tarjeta debe tener 16 dígitos': { en: 'The card number must have 16 digits', pt: 'O número do cartão deve ter 16 dígitos' },
  'El vencimiento debe tener el formato MM/AA': { en: 'The expiry date must use the MM/YY format', pt: 'A validade deve ter o formato MM/AA' },
  'La tarjeta está vencida': { en: 'The card has expired', pt: 'O cartão está vencido' },
  'El código de seguridad debe tener 3 o 4 dígitos': { en: 'The security code must have 3 or 4 digits', pt: 'O código de segurança deve ter 3 ou 4 dígitos' },
  'Elige un método de pago válido': { en: 'Choose a valid payment method', pt: 'Escolha um método de pagamento válido' },
  'Solo puedes pagar una reserva que el cuidador ya confirmó': { en: 'You can only pay for a booking the caregiver has already confirmed', pt: 'Você só pode pagar uma reserva que o cuidador já confirmou' },
  'Ya pasó la fecha de inicio: esta reserva no se pagó a tiempo': { en: 'The start date has passed: this booking wasn’t paid in time', pt: 'A data de início já passou: esta reserva não foi paga a tempo' },
  'Esta reserva ya está pagada': { en: 'This booking is already paid', pt: 'Esta reserva já está paga' },
  'Todavía no hay pagos disponibles en tu país': { en: 'Payments are not available in your country yet', pt: 'Ainda não há pagamentos disponíveis no seu país' },
  'Ese método de pago no está disponible en tu país': { en: 'That payment method is not available in your country', pt: 'Esse método de pagamento não está disponível no seu país' },
  'El pago fue rechazado. Prueba con otro dato o con otro método': { en: 'The payment was declined. Try other details or another method', pt: 'O pagamento foi recusado. Tente com outro dado ou outro método' },
  '7 días o más antes del inicio: se devuelve el 100 %': { en: '7 days or more before the start: 100% is refunded', pt: '7 dias ou mais antes do início: devolvemos 100%' },
  'Entre 2 y 6 días antes: se devuelve el 50 %': { en: 'Between 2 and 6 days before: 50% is refunded', pt: 'Entre 2 e 6 dias antes: devolvemos 50%' },
  'Menos de 2 días antes: no hay reembolso': { en: 'Less than 2 days before: no refund', pt: 'Menos de 2 dias antes: não há reembolso' },
  'Compensación por cancelación tardía': { en: 'Compensation for late cancellation', pt: 'Compensação por cancelamento tardio' },

  // ---------- Reservas ----------
  'Solo los viajeros pueden pedir reservas': { en: 'Only travelers can request bookings', pt: 'Só os viajantes podem pedir reservas' },
  'Solo los cuidadores pueden responder reservas': { en: 'Only caregivers can respond to bookings', pt: 'Só os cuidadores podem responder reservas' },
  'Elige un cuidador': { en: 'Choose a caregiver', pt: 'Escolha um cuidador' },
  'Elige una mascota': { en: 'Choose a pet', pt: 'Escolha um pet' },
  'Elige un servicio válido': { en: 'Choose a valid service', pt: 'Escolha um serviço válido' },
  'No puedes reservarte a ti mismo': { en: 'You can’t book yourself', pt: 'Você não pode reservar a si mesmo' },
  'Las fechas no son válidas': { en: 'The dates are not valid', pt: 'As datas não são válidas' },
  'La fecha de entrada ya pasó': { en: 'The check-in date has already passed', pt: 'A data de entrada já passou' },
  'Elige la hora de inicio y de fin (horas en punto)': { en: 'Choose the start and end time (on the hour)', pt: 'Escolha o horário de início e de término (horas cheias)' },
  'Esa hora ya pasó: elige una hora más tarde': { en: 'That time has passed: choose a later time', pt: 'Esse horário já passou: escolha um horário mais tarde' },
  'El alojamiento necesita al menos una noche': { en: 'Boarding needs at least one night', pt: 'A hospedagem precisa de pelo menos uma noite' },
  'Esa mascota no es tuya o está desactivada': { en: 'That pet isn’t yours or is deactivated', pt: 'Esse pet não é seu ou está desativado' },
  'Ese cuidador no está disponible para ese servicio': { en: 'That caregiver isn’t available for that service', pt: 'Esse cuidador não está disponível para esse serviço' },
  'Solo puedes reservar cuidadores de tu región': { en: 'You can only book caregivers in your region', pt: 'Você só pode reservar cuidadores da sua região' },
  'El cuidador ya tiene una reserva confirmada a esa hora': { en: 'The caregiver already has a confirmed booking at that time', pt: 'O cuidador já tem uma reserva confirmada nesse horário' },
  'El cuidador ya tiene una reserva confirmada en esas fechas': { en: 'The caregiver already has a confirmed booking on those dates', pt: 'O cuidador já tem uma reserva confirmada nessas datas' },
  'Esta solicitud venció: pasaron más de 24 horas sin respuesta': { en: 'This request expired: more than 24 hours passed without a response', pt: 'Esta solicitação expirou: passaram mais de 24 horas sem resposta' },
  'Esta reserva ya está confirmada. Para cancelarla se aplica la política de reembolso': {
    en: 'This booking is already confirmed. Cancelling it is subject to the refund policy',
    pt: 'Esta reserva já está confirmada. Para cancelá-la, aplica-se a política de reembolso',
  },
  'El servicio ya empezó: ya no se puede cancelar': { en: 'The service has already started: it can no longer be cancelled', pt: 'O serviço já começou: não pode mais ser cancelado' },
  'Ya tienes una reserva confirmada que se cruza con esas fechas': { en: 'You already have a confirmed booking that overlaps those dates', pt: 'Você já tem uma reserva confirmada que coincide com essas datas' },
  'Se canceló automáticamente: no se pagó antes de la fecha de inicio': { en: 'Cancelled automatically: it wasn’t paid before the start date', pt: 'Cancelada automaticamente: não foi paga antes da data de início' },
  'Cancelada por el viajero': { en: 'Cancelled by the traveler', pt: 'Cancelada pelo viajante' },

  // ---------- Seguimiento ----------
  'Solo el cuidador sube reportes': { en: 'Only the caregiver uploads reports', pt: 'Só o cuidador envia relatórios' },
  'Los reportes se suben mientras el servicio está en curso': { en: 'Reports are uploaded while the service is in progress', pt: 'Os relatórios são enviados enquanto o serviço está em andamento' },
  'Escribe un título, por ejemplo "Paseo en el parque"': { en: 'Write a title, for example "Walk in the park"', pt: 'Escreva um título, por exemplo "Passeio no parque"' },
  'Agrega una foto o cuéntale al viajero cómo va': { en: 'Add a photo or tell the traveler how it’s going', pt: 'Adicione uma foto ou conte ao viajante como está indo' },
  'Esta reserva ya no está activa': { en: 'This booking is no longer active', pt: 'Esta reserva não está mais ativa' },
  'El chat se cerró 7 días después del servicio. El historial queda como evidencia': {
    en: 'The chat closed 7 days after the service. The history is kept as evidence',
    pt: 'O chat foi encerrado 7 dias após o serviço. O histórico fica como evidência',
  },
  'Escribe un mensaje': { en: 'Write a message', pt: 'Escreva uma mensagem' },
  'Solo el viajero puede activar la emergencia': { en: 'Only the traveler can trigger the emergency', pt: 'Só o viajante pode acionar a emergência' },
  'El botón de emergencia funciona mientras el servicio está en curso': { en: 'The emergency button works while the service is in progress', pt: 'O botão de emergência funciona enquanto o serviço está em andamento' },
  'Escribe el nombre de tu contacto': { en: 'Enter your contact’s name', pt: 'Digite o nome do seu contato' },
  'Escribe un teléfono válido': { en: 'Enter a valid phone number', pt: 'Digite um telefone válido' },
  'El correo no es válido': { en: 'The email is not valid', pt: 'O e-mail não é válido' },
  'Escribe el nombre del veterinario': { en: 'Enter the veterinarian’s name', pt: 'Digite o nome do veterinário' },
  'Aviso no válido': { en: 'Invalid notice', pt: 'Aviso inválido' },
};

// Partes variables que también se traducen.
const CAMPOS = { // etiquetas de validacion.js: texto('El nombre', …)
  'El nombre': { en: 'Name', pt: 'nome' },
  'El teléfono': { en: 'Phone', pt: 'telefone' },
  'La ciudad': { en: 'City', pt: 'cidade' },
};
const ESTADOS_RESERVA = {
  pendiente: { en: 'pending', pt: 'pendente' },
  confirmada: { en: 'confirmed', pt: 'confirmada' },
  rechazada: { en: 'rejected', pt: 'recusada' },
  vencida: { en: 'expired', pt: 'expirada' },
  cancelada: { en: 'cancelled', pt: 'cancelada' },
  en_curso: { en: 'in progress', pt: 'em andamento' },
  completada: { en: 'completed', pt: 'concluída' },
};
const UNIDADES = { hora: { en: 'hour', pt: 'hora' }, noche: { en: 'night', pt: 'noite' } };
const SERVICIOS = { // shared/servicios.js, en minúscula
  alojamiento: { en: 'boarding', pt: 'hospedagem' },
  'cuidado a domicilio': { en: 'home care', pt: 'cuidado a domicílio' },
  paseo: { en: 'walks', pt: 'passeio' },
  'guardería': { en: 'daycare', pt: 'creche' },
};
const de = (mapa, clave, idioma) => mapa[clave]?.[idioma] ?? clave;
const plural = (n, uno, varios) => (Number(n) === 1 ? uno : varios);
const CAMPO = Object.keys(CAMPOS).join('|');

const PATRONES = [
  // Auth / cuenta: intentos y esperas
  { es: /^Código incorrecto\. Te quedan (\d+) intentos?(\.?)$/,
    en: (n, p) => `Incorrect code. You have ${n} ${plural(n, 'attempt', 'attempts')} left${p}`,
    pt: (n, p) => `Código incorreto. Você tem mais ${n} ${plural(n, 'tentativa', 'tentativas')}${p}` },
  { es: /^Demasiados intentos\. Intenta de nuevo en (\d+) minutos?\.$/,
    en: (n) => `Too many attempts. Try again in ${n} ${plural(n, 'minute', 'minutes')}.`,
    pt: (n) => `Muitas tentativas. Tente novamente em ${n} ${plural(n, 'minuto', 'minutos')}.` },
  { es: /^Espera (\d+) segundos para pedir otro código$/,
    en: 'Wait $1 seconds to request another code', pt: 'Aguarde $1 segundos para pedir outro código' },
  { es: /^Espera (\d+) s para pedir otro código$/,
    en: 'Wait $1 s to request another code', pt: 'Aguarde $1 s para pedir outro código' },

  // Validaciones de cuenta con etiqueta de campo
  { es: new RegExp(`^(${CAMPO}) es obligatorio$`),
    en: (c) => `${de(CAMPOS, c, 'en')} is required`, pt: (c) => `O campo ${de(CAMPOS, c, 'pt')} é obrigatório` },
  { es: new RegExp(`^(${CAMPO}) es muy corto \\(mínimo (\\d+) caracteres\\)$`),
    en: (c, n) => `${de(CAMPOS, c, 'en')} is too short (minimum ${n} characters)`,
    pt: (c, n) => `O campo ${de(CAMPOS, c, 'pt')} é muito curto (mínimo de ${n} caracteres)` },
  { es: new RegExp(`^(${CAMPO}) es muy largo \\(máximo (\\d+) caracteres\\)$`),
    en: (c, n) => `${de(CAMPOS, c, 'en')} is too long (maximum ${n} characters)`,
    pt: (c, n) => `O campo ${de(CAMPOS, c, 'pt')} é muito longo (máximo de ${n} caracteres)` },
  { es: /^El comentario admite máximo (\d+) caracteres$/,
    en: 'The comment allows up to $1 characters', pt: 'O comentário permite no máximo $1 caracteres' },

  // Fotos y archivos
  { es: /^La foto pesa demasiado \(máximo ([\d.]+) MB\)$/,
    en: 'The photo is too large (maximum $1 MB)', pt: 'A foto é grande demais (máximo de $1 MB)' },
  { es: /^La foto debe pesar máximo ([\d.]+) MB$/,
    en: 'The photo must be $1 MB at most', pt: 'A foto deve ter no máximo $1 MB' },
  { es: /^Cada archivo debe pesar máximo ([\d.]+) MB\.$/,
    en: 'Each file must be $1 MB at most.', pt: 'Cada arquivo deve ter no máximo $1 MB.' },
  { es: /^Puedes tener máximo (\d+) fotos$/,
    en: 'You can have up to $1 photos', pt: 'Você pode ter no máximo $1 fotos' },

  // Cuidadores: precio por servicio
  { es: /^Escribe un precio por (hora|noche) mayor a 0 para (.+)$/,
    en: (u, s) => `Enter a price per ${de(UNIDADES, u, 'en')} greater than 0 for ${de(SERVICIOS, s, 'en')}`,
    pt: (u, s) => `Digite um preço por ${de(UNIDADES, u, 'pt')} maior que 0 para ${de(SERVICIOS, s, 'pt')}` },

  // Búsqueda
  { es: /^El radio debe estar entre 1 y (\d+) km$/,
    en: 'The radius must be between 1 and $1 km', pt: 'O raio deve estar entre 1 e $1 km' },

  // Reservas
  { es: /^El servicio debe durar entre (\d+) y (\d+) horas$/,
    en: 'The service must last between $1 and $2 hours', pt: 'O serviço deve durar entre $1 e $2 horas' },
  { es: /^La reserva no puede durar más de (\d+) días$/,
    en: 'The booking can’t last more than $1 days', pt: 'A reserva não pode durar mais de $1 dias' },
  { es: /^Esta reserva ya está (\w+)$/,
    en: (e) => `This booking is already ${de(ESTADOS_RESERVA, e, 'en')}`,
    pt: (e) => `Esta reserva já está ${de(ESTADOS_RESERVA, e, 'pt')}` },
  { es: /^Cancelada por el viajero · reembolso del ([\d.]+) %$/,
    en: 'Cancelled by the traveler · $1% refund', pt: 'Cancelada pelo viajante · reembolso de $1%' },
  { es: /^Tienes (\d+) reserva\(s\) activa\(s\)$/,
    en: (n) => `You have ${n} active ${plural(n, 'booking', 'bookings')}`,
    pt: (n) => `Você tem ${n} ${plural(n, 'reserva ativa', 'reservas ativas')}` },

  // Pagos
  { es: /^La pasarela de tu país cobra en ([A-Z]{3}) y la reserva está en ([A-Z]{3})$/,
    en: 'The payment gateway in your country charges in $1 and the booking is in $2',
    pt: 'O gateway de pagamento do seu país cobra em $1 e a reserva está em $2' },
  { es: /^Cancelación (-?\d+) día\(s\) antes del inicio · (.+)$/,
    en: (n, regla) => `Cancellation ${n} ${plural(n, 'day', 'days')} before the start · ${traducirMensajeServidor(regla, 'en')}`,
    pt: (n, regla) => `Cancelamento ${n} ${plural(n, 'dia', 'dias')} antes do início · ${traducirMensajeServidor(regla, 'pt')}` },
];

const idiomaDocumento = () => (typeof document !== 'undefined' && document.documentElement.lang) || 'es';

// Traduce un texto que vino del servidor. Devuelve el original si el idioma es español o si no se conoce.
export function traducirMensajeServidor(texto, idioma = idiomaDocumento()) {
  if (typeof texto !== 'string' || !texto || idioma === 'es') return texto;
  const exacto = EXACTOS[texto]?.[idioma];
  if (exacto) return exacto;
  for (const p of PATRONES) {
    const m = texto.match(p.es);
    const plantilla = m && p[idioma];
    if (!plantilla) continue;
    return typeof plantilla === 'function'
      ? plantilla(...m.slice(1))
      : plantilla.replace(/\$(\d)/g, (_, i) => m[Number(i)] ?? '');
  }
  return texto;
}
