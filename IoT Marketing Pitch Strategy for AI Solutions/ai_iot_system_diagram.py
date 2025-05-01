from diagrams import Diagram, Cluster, Edge
from diagrams.onprem.compute import Server
from diagrams.onprem.database import PostgreSQL
from diagrams.onprem.network import Internet
from diagrams.onprem.queue import Kafka
from diagrams.aws.compute import Lambda
from diagrams.aws.storage import S3
from diagrams.aws.integration import SNS
from diagrams.aws.security import WAF
from diagrams.aws.network import CloudFront
from diagrams.programming.framework import React
from diagrams.generic.device import Mobile, Tablet
from diagrams.generic.compute import Rack
from diagrams.generic.network import Firewall
from diagrams.onprem.monitoring import Grafana, Prometheus
from diagrams.onprem.ci import Jenkins
from diagrams.saas.chat import Slack
from diagrams.azure.compute import FunctionApps
from diagrams.azure.iot import IotHub
from diagrams.gcp.ml import AutoML
from diagrams.aws.ml import Rekognition
from diagrams.aws.compute import EC2

# Set diagram attributes
graph_attr = {
    "fontsize": "24",
    "bgcolor": "white",
    "layout": "dot",
    "pad": "0.5",
    "splines": "spline",
    "nodesep": "0.60",
    "ranksep": "0.75",
    "fontname": "Sans-Serif",
    "fontcolor": "#2D3436",
    "fontsize": "24",
    "compound": "true",
}

node_attr = {
    "fontname": "Sans-Serif",
    "fontsize": "16",
    "fontcolor": "#2D3436",
}

edge_attr = {
    "fontname": "Sans-Serif",
    "fontsize": "14",
    "fontcolor": "#2D3436",
}

# Create the diagram
with Diagram("AI-Powered IoT Device Management System", 
             filename="/home/ubuntu/quest_iot_pitch/ai_iot_system_diagram",
             outformat="png",
             show=False,
             graph_attr=graph_attr,
             node_attr=node_attr,
             edge_attr=edge_attr):

    # External components
    with Cluster("End Users"):
        admin_portal = React("Admin Portal")
        mobile_app = Mobile("Mobile App")
        tablet = Tablet("Field Technician Tablet")
    
    internet = Internet("Internet")
    
    # Security layer
    with Cluster("Security Layer"):
        firewall = Firewall("Firewall")
        waf = WAF("Web Application Firewall")
        
    # Edge layer with IoT devices
    with Cluster("Edge Layer - IoT Devices"):
        with Cluster("Manufacturing Floor"):
            iot_devices1 = Rack("IoT Sensors & Actuators")
            edge_gateway1 = Server("Edge Gateway")
            edge_ai1 = AutoML("Edge AI Agent")
            
        with Cluster("Remote Facilities"):
            iot_devices2 = Rack("IoT Sensors & Actuators")
            edge_gateway2 = Server("Edge Gateway")
            edge_ai2 = AutoML("Edge AI Agent")
            
        with Cluster("Field Deployments"):
            iot_devices3 = Rack("IoT Sensors & Actuators")
            edge_gateway3 = Server("Edge Gateway")
            edge_ai3 = AutoML("Edge AI Agent")
    
    # Core IoT Platform
    with Cluster("Core IoT Platform"):
        iot_hub = IotHub("IoT Hub")
        
        with Cluster("Device Management Services"):
            device_registry = PostgreSQL("Device Registry")
            firmware_repo = S3("Firmware Repository")
            config_manager = Server("Configuration Manager")
            
        with Cluster("Update Orchestration"):
            update_scheduler = Jenkins("Update Scheduler")
            deployment_manager = Lambda("Deployment Manager")
            rollback_service = FunctionApps("Rollback Service")
            
        with Cluster("Data Processing"):
            message_broker = Kafka("Message Broker")
            stream_processor = Lambda("Stream Processor")
            data_lake = S3("Data Lake")
            
        with Cluster("Monitoring & Analytics"):
            metrics_db = PostgreSQL("Metrics Database")
            prometheus = Prometheus("Prometheus")
            analytics_engine = Server("Analytics Engine")
            anomaly_detector = Lambda("Anomaly Detector")
            grafana = Grafana("Dashboards")
            
        with Cluster("Notification System"):
            notification_service = SNS("Notification Service")
            alert_manager = Server("Alert Manager")
    
    # NEW: AI Agent Layer
    with Cluster("AI Agent Ecosystem"):
        with Cluster("Autonomous Decision Agents"):
            maintenance_agent = EC2("Predictive Maintenance Agent")
            optimization_agent = EC2("Resource Optimization Agent")
            security_agent = EC2("Security Monitoring Agent")
        
        with Cluster("Cognitive Services"):
            nlp_engine = EC2("Natural Language Processing")
            vision_system = Rekognition("Computer Vision")
            ml_pipeline = EC2("ML Training Pipeline")
        
        with Cluster("Agent Orchestration"):
            agent_coordinator = EC2("Agent Orchestrator")
            knowledge_base = PostgreSQL("Knowledge Base")
            agent_registry = PostgreSQL("Agent Registry")
    
    # Connections
    # User interfaces to security
    admin_portal >> internet >> firewall
    mobile_app >> internet >> firewall
    tablet >> internet >> firewall
    
    # Security to core platform
    firewall >> waf >> iot_hub
    
    # Edge devices to IoT Hub
    edge_gateway1 >> internet >> firewall >> iot_hub
    edge_gateway2 >> internet >> firewall >> iot_hub
    edge_gateway3 >> internet >> firewall >> iot_hub
    
    # IoT devices to edge gateways and edge AI
    iot_devices1 >> edge_gateway1
    iot_devices1 >> edge_ai1
    edge_ai1 >> edge_gateway1
    
    iot_devices2 >> edge_gateway2
    iot_devices2 >> edge_ai2
    edge_ai2 >> edge_gateway2
    
    iot_devices3 >> edge_gateway3
    iot_devices3 >> edge_ai3
    edge_ai3 >> edge_gateway3
    
    # IoT Hub connections
    iot_hub >> device_registry
    iot_hub >> message_broker
    
    # Device management flows
    device_registry << config_manager
    firmware_repo << deployment_manager
    update_scheduler >> deployment_manager
    deployment_manager >> iot_hub
    deployment_manager >> rollback_service
    
    # Data processing flows
    message_broker >> stream_processor
    stream_processor >> data_lake
    stream_processor >> metrics_db
    
    # Monitoring flows
    metrics_db >> prometheus
    prometheus >> grafana
    metrics_db >> analytics_engine
    analytics_engine >> anomaly_detector
    
    # Notification flows
    anomaly_detector >> alert_manager
    alert_manager >> notification_service
    
    # NEW: AI Agent connections
    # Data flows to AI agents
    data_lake >> ml_pipeline
    ml_pipeline >> maintenance_agent
    ml_pipeline >> optimization_agent
    ml_pipeline >> security_agent
    
    # AI agent orchestration
    maintenance_agent >> agent_coordinator
    optimization_agent >> agent_coordinator
    security_agent >> agent_coordinator
    agent_coordinator >> knowledge_base
    agent_coordinator >> agent_registry
    
    # AI agent integration with core platform
    maintenance_agent >> update_scheduler
    optimization_agent >> config_manager
    security_agent >> alert_manager
    
    # Cognitive services integration
    nlp_engine >> agent_coordinator
    vision_system >> agent_coordinator
    
    # AI agent feedback to users
    agent_coordinator >> notification_service
    
    # Feedback loops
    notification_service >> admin_portal
    notification_service >> mobile_app
    notification_service >> tablet
    
    grafana >> admin_portal
