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
with Diagram("IoT Device Management System for Scale Maintenance", 
             filename="/home/ubuntu/quest_iot_pitch/iot_system_diagram",
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
            
        with Cluster("Remote Facilities"):
            iot_devices2 = Rack("IoT Sensors & Actuators")
            edge_gateway2 = Server("Edge Gateway")
            
        with Cluster("Field Deployments"):
            iot_devices3 = Rack("IoT Sensors & Actuators")
            edge_gateway3 = Server("Edge Gateway")
    
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
    
    # IoT devices to edge gateways
    iot_devices1 >> edge_gateway1
    iot_devices2 >> edge_gateway2
    iot_devices3 >> edge_gateway3
    
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
    
    # Feedback loops
    notification_service >> admin_portal
    notification_service >> mobile_app
    notification_service >> tablet
    
    grafana >> admin_portal
