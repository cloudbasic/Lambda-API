/*
Sample AWS Lambda function to call CBR API

Uses the aws4 node.js library (https://github.com/mhart/aws4) to simplify call signing

For more information on packaging your custom Lambda function see the AWS documentation (http://docs.aws.amazon.com/lambda/latest/dg/nodejs-create-deployment-pkg.html) 

*/
'use strict';

var httpClient = require('./http-client.js'),
    deepcopy = require("deepcopy"),
    CONFIG = require('./config.json');

exports.handler = (event, context, callback) => {

    scenario();

    function scenario() {

        CONFIG.xml = event.xml;
        CONFIG.https = event.https;
        
        var testCase = "Test case: " + (CONFIG.xml ? " XML " : " JSON ") + '/' + (CONFIG.https ? " HTTPS " : " HTTP ") + "version";

        console.log(testCase);

       var credentials = { accessKeyId: 'ACCESSKEYIDONE', secretAccessKey: 'SECRETACCESSKEYONE' };
    var secondCreds = { accessKeyId: 'ACCESSKEYIDTWO', secretAccessKey: 'SECRETACCESSKEYTWO' };

    activateInstance('i-011c1c1edd1111dc1', function (credentials) {
        console.log(`Create Instance ended!`);
        console.log(credentials);

        createUser(credentials, function (user) {
            console.log(` `);
            console.log(`create user ended!`);
            console.log(user);

            createReplication(credentials, function (replication) {
                console.log(` `);
                console.log(`create replication ended!`);
                console.log(replication);

                replicationStatus(credentials, replication.replicationId, function (replicationStatus) {
                    console.log(` `);
                    console.log(`Replication Status ended!`);
                    console.log(replicationStatus);

                    analyzeReplication(credentials, replication.replicationId, function (data) {
                        console.log(` `);
                        console.log(`Analyze Replication ended!`);
                        console.log(data);


                        deleteReplication(credentials, replication.replicationId, function (data) {
                            console.log(` `);
                            console.log(`Delete Replication ended!`);
                        });
                    });
                });

                httpClient.changeHost('your.server2.IP.address');

                activateInstance('i-022c2c2edd2222dc2', function (seconCreds) {
                    console.log(` `);
                    console.log(`Create Second Instance ended!`);
                    console.log(seconCreds);
                });

                httpClient.changeHost('your.server1.IP.address');

                createCluster(credentials, 'your.server2.IP.address', secondCreds, function (data) {
                    console.log(` `);
                    console.log(`Create Cluster ended!`);

                    deleteCluster(credentials, 'your.server1.IP.address', function (data) {
                        console.log(` `);
                        console.log(`Delete Cluster ended!`);
                    });
                });

            });
        });
    //});
}


    //Activate the insance
    function activateInstance(instanceId, callback) {
        var credentials = { accessKeyId: '', secretAccessKey: '' };

        var model = deepcopy(CONFIG.activateInstance);
        model.ActivateInstanceRequest.InstanceId = instanceId;

        // we can now query the CBR API 
        httpClient.post('ActivateInstance', model, function (res) {
            //set instance credentials
            credentials.accessKeyId = res.publicKey;
            credentials.secretAccessKey = res.privateKey;

            callback(credentials);
        });
    }

    //Create User
    function createUser(creds, callback) {
        var model = deepcopy(CONFIG.createUser);

        httpClient.post('CreateUser', model, function (res) {            
            callback(res);
        }, creds);
    }

    //Create Replication
    function createReplication(creds, callback) {
        var model = deepcopy(CONFIG.createReplication);

        httpClient.post('CreateReplication', model, function (res) {           
            callback(res);
        }, creds);
    }

    //Delete Replication
    function deleteReplication(creds, replicationId, callback) {
        var model = deepcopy(CONFIG.deleteReplication);
        model.DeleteReplicationRequest.ReplicationId = replicationId;

        httpClient.post('DeleteReplication', model, function (res) {
            callback("Ok");
        }, creds);
    }

    //Replication Status
    function replicationStatus(creds, replicationId, callback) {
        var model = deepcopy(CONFIG.replicationStatus);
        model.ReplicationStatusRequest.ReplicationId = replicationId;

        httpClient.post('ReplicationStatus', model, function (res) {
            callback(res);
        }, creds);
    }

    //Analyze Replication
    function analyzeReplication(creds, replicationId, callback) {
        var model = deepcopy(CONFIG.analyzeReplication);
        model.AnalyzeReplicationRequest.ReplicationId = replicationId;

        httpClient.post('AnalyzeReplication', model, function (res) {
            callback(res);
        }, creds);
    }

    //Create Cluster
    function createCluster(creds, serverIP, serverCreds, callback) {
        var model = deepcopy(CONFIG.createCluster);
        model.CreateClusterRequest.RemoteServer = serverIP;

        model.CreateClusterRequest.PublicKey = serverCreds.accessKeyId;
        model.CreateClusterRequest.PrivateKey = serverCreds.secretAccessKey;

        httpClient.post('CreateCluster', model, function (res) {
            callback("Ok");
        }, creds);
    }

    //Delete Cluster
    //StandaloneServer - Standalone server becomes primary. Schedules on the other server are inactivated.
    //The API call can be executed against the API of either of the cluster servers 
    function deleteCluster(creds, serverIP, callback) {
        var model = deepcopy(CONFIG.deleteCluster);
        model.DeleteClusterRequest.StandaloneServer = serverIP;

        httpClient.post('DeleteCluster', model, function (res) {
            callback("Ok");
        }, creds);
    }
}