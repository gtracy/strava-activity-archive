'use script';

module.exports = {

    getPort : function getPort() {
        return 3304
    },

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
            level: level,
            autoLogging: false
        });
    },

    getAWSConfig : function getAWSConfig(cloud_sqs) {
        if( process.env.NODE_ENV === 'prod' || cloud_sqs ) {
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

    getSQSConfig : function getSQSConfig(queue) {
        // we always use cloud queues (nothing local) but there
        // are different queues for prod and test
        if( process.env.NODE_ENV === 'prod' ) {
            switch (queue) {
                case 'activity_fetch':
                    return process.env.SQS_STRAVA_ACTIVITY_FETCH_JOBS_PROD;
                    break;
                case 'supervisor':
                    return process.env.SQS_STRAVA_SUPERVISOR_JOBS_PROD;
                    break;
                default:
                    return 'MISSING_SQS_CONFIG';
            }
        } else {
            switch (queue) {
                case 'activity_fetch':
                    return process.env.SQS_STRAVA_ACTIVITY_FETCH_JOBS_TEST;
                    break;
                case 'supervisor':
                    return process.env.SQS_STRAVA_SUPERVISOR_JOBS_TEST;
                    break;
                default:
                    return 'MISSING_SQS_CONFIG';
            }
        }
    }

}