const Joi = require('joi');

const registerValidation = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .required()
    .messages({
      'string.empty': 'El nombre es requerido',
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 255 caracteres',
      'any.required': 'El nombre es requerido'
    }),

  email: Joi.string()
    .email()
    .max(255)
    .lowercase()
    .trim()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'Debe ser un email válido',
      'string.max': 'El email no puede tener más de 255 caracteres',
      'any.required': 'El email es requerido'
    }),

  password: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.empty': 'La contraseña es requerida',
      'string.min': 'La contraseña debe tener al menos 6 caracteres',
      'string.max': 'La contraseña no puede tener más de 128 caracteres',
      'string.pattern.base': 'La contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La contraseña es requerida'
    }),

  confirmPassword: Joi.string()
    .valid(Joi.ref('password'))
    .required()
    .messages({
      'any.only': 'Las contraseñas no coinciden',
      'any.required': 'La confirmación de contraseña es requerida'
    }),

  role: Joi.string()
    .valid('user', 'admin')
    .default('user')
    .messages({
      'any.only': 'El rol debe ser "user" o "admin"'
    })
});

const loginValidation = Joi.object({
  email: Joi.string()
    .email()
    .required()
    .messages({
      'string.empty': 'El email es requerido',
      'string.email': 'Debe ser un email válido',
      'any.required': 'El email es requerido'
    }),

  password: Joi.string()
    .required()
    .messages({
      'string.empty': 'La contraseña es requerida',
      'any.required': 'La contraseña es requerida'
    })
});

const refreshTokenValidation = Joi.object({
  refreshToken: Joi.string()
    .required()
    .messages({
      'string.empty': 'El refresh token es requerido',
      'any.required': 'El refresh token es requerido'
    })
});

const updateProfileValidation = Joi.object({
  nombre: Joi.string()
    .min(2)
    .max(255)
    .trim()
    .messages({
      'string.min': 'El nombre debe tener al menos 2 caracteres',
      'string.max': 'El nombre no puede tener más de 255 caracteres'
    }),

  email: Joi.string()
    .email()
    .max(255)
    .lowercase()
    .trim()
    .messages({
      'string.email': 'Debe ser un email válido',
      'string.max': 'El email no puede tener más de 255 caracteres'
    })
});

const changePasswordValidation = Joi.object({
  currentPassword: Joi.string()
    .required()
    .messages({
      'string.empty': 'La contraseña actual es requerida',
      'any.required': 'La contraseña actual es requerida'
    }),

  newPassword: Joi.string()
    .min(6)
    .max(128)
    .pattern(new RegExp('^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)'))
    .required()
    .messages({
      'string.empty': 'La nueva contraseña es requerida',
      'string.min': 'La nueva contraseña debe tener al menos 6 caracteres',
      'string.max': 'La nueva contraseña no puede tener más de 128 caracteres',
      'string.pattern.base': 'La nueva contraseña debe contener al menos una minúscula, una mayúscula y un número',
      'any.required': 'La nueva contraseña es requerida'
    }),

  confirmNewPassword: Joi.string()
    .valid(Joi.ref('newPassword'))
    .required()
    .messages({
      'any.only': 'Las nuevas contraseñas no coinciden',
      'any.required': 'La confirmación de la nueva contraseña es requerida'
    })
});

const validate = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true
    });

    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message
      }));

      return res.status(400).json({
        success: false,
        message: 'Datos de entrada inválidos',
        errors
      });
    }

    req.body = value;
    next();
  };
};

module.exports = {
  registerValidation,
  loginValidation,
  refreshTokenValidation,
  updateProfileValidation,
  changePasswordValidation,
  validate
}; 