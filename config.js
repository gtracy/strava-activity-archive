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

    getAWSConfig : function getAWSConfig(sqs) {
        if( process.env.NODE_ENV === 'prod' || sqs ) {
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

    getSQSConfig : function getSQSConfig() {
        // we always use cloud queues (nothing local) but there
        // are different queues for prod and test
        if( process.env.NODE_ENV === 'prod' ) {
            return process.env.SQS_STRAVA_ACTIVITY_FETCH_JOBS_PROD;
        } else {
            return process.env.SQS_STRAVA_ACTIVITY_FETCH_JOBS_TEST;
        }
    }

}