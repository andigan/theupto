var config = {};

// set port
config.port = 8000;

// set mongDB database
config.database_name = 'max';

// set use_cdn to use cdns rather than local modules
config.use_cdn = true;

// set image directories
config.logdir              = 'logs/filelog';
config.publicimagedir      = 'public/art';
config.slashimagedirslash  = '/art/';

// set start up dragger statuses
config.resize_dragger_status               = 'none';
config.opacity_dragger_status              = 'none';
config.rotation_dragger_status             = 'none';
config.blur_brightness_dragger_status      = 'none';
config.grayscale_invert_dragger_status     = 'none';
config.contrast_saturate_dragger_status    = 'none';
config.party_dragger_status                = 'none';



module.exports = config;
