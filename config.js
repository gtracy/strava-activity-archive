'use script';

module.exports = {

    getEnv : function getEnv() {
        if( process.env.NODE_ENV === 'prod' ) {
            return process.env.NODE_ENV;
        } else {
            return 'dev';
        }
    },

    getLogConfig : function getLogConfig() {
        let level = 'info';
        if( process.env.LOG_LEVEL ) {
            level = process.env.LOG_LEVEL;
        } else if( module.exports.getEnv() === 'dev' ) {
            level = 'debug';
        }

        return({
            useLevel: level,
            autoLogging: false
        });
    },

    getAWSConfig : function getAWSConfig() {
        if( process.env.NODE_ENV === 'prod' ) {
            return {
                region : process.env.AWS_REGION,
                access_id : process.env.AWS_ACCESS_ID,
                access_secret : process.env.AWS_ACCESS_SECRET
            }
        } else {
            return {
                endpoint : 'http://localhost:8000',
            }
        }
    },

}