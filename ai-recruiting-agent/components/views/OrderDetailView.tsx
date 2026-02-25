import React, { useState, useEffect, useMemo } from 'react';
import { ViewState, CandidateStatus, Observation, ResumeSection } from '../../types';
import { ChevronLeft, Clock, Mail, Phone, FileText, CheckCircle2, AlertTriangle, AlertOctagon, RefreshCw, Copy, Bell, MoreHorizontal, XCircle, UserCheck, Mic2, Play, Pause, Download, Briefcase, MapPin, MessageSquare, Link, PhoneForwarded, RotateCcw, Loader2 } from 'lucide-react';
import RedPenCard from '../RedPenCard';

interface OrderDetailViewProps {
  candidateId: string | null;
  onNavigate: (view: ViewState) => void;
  defaultTab?: 'ANALYSIS' | 'TIMELINE' | 'RECORDING';
}

const EILEEN_AVATAR = "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=200&h=200&fit=crop&q=80";

// --- 1. CONFIGURATION & TYPES ---

const STEPS = [
    { id: CandidateStatus.PENDING_OUTREACH, label: '待触达', icon: Clock },
    { id: CandidateStatus.INVITED, label: '已邀请', icon: Mail },
    { id: CandidateStatus.INTERVIEWING, label: '正在面试', icon: Phone },
    { id: CandidateStatus.ANALYZING, label: '分析中', icon: FileText },
    { id: CandidateStatus.DELIVERED, label: '已交付', icon: CheckCircle2 },
];

interface TimelineLog {
    time: string;
    title: string;
    detail: string;
    type?: 'default' | 'error' | 'success';
}

// --- 2. ROBUST MOCK DATA ENGINE ---

const AVATARS: Record<string, string> = {
    '1': 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=100&h=100&fit=crop&q=80',
    '2': 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&q=80',
    '3': 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&q=80',
    '4': 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&q=80',
    '5': 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&q=80',
    '6': 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=100&h=100&fit=crop&q=80',
};

const getMockCandidateContext = (id: string | null) => {
    // Default fallback
    let status = CandidateStatus.DELIVERED;
    let name = '未知候选人';
    let role = '候选人';
    let avatar = AVATARS['4'];
    
    // Explicit Mock Cases mapping to Dashboard IDs
    switch (id) {
        case '1': // 赵六 - Newly created
            status = CandidateStatus.PENDING_OUTREACH;
            name = '赵六';
            role = 'Java 专家';
            avatar = AVATARS['1'];
            break;
        case '2': // 王五 - In Call
            status = CandidateStatus.INTERVIEWING;
            name = '王五';
            role = 'Java 架构师';
            avatar = AVATARS['2'];
            break;
        case '3': // 钱七 - Analyzing
            status = CandidateStatus.ANALYZING;
            name = '钱七';
            role = '测试专家';
            avatar = AVATARS['3'];
            break;
        case '4': // 刘启迪 - Delivered
            status = CandidateStatus.DELIVERED;
            name = '刘启迪';
            role = 'AI平台开发工程师';
            avatar = AVATARS['4'];
            break;
        case '5': // 李四 - Exception
            status = CandidateStatus.EXCEPTION;
            name = '李四';
            role = '产品经理';
            avatar = AVATARS['5'];
            break;
        case '6': // Extra - Invited
            status = CandidateStatus.INVITED;
            name = '孙九';
            role = '算法工程师';
            avatar = AVATARS['6'];
            break;
        default:
            status = CandidateStatus.DELIVERED;
            name = '张三 (演示)';
            role = '高级前端工程师';
            avatar = AVATARS['4'];
    }

    // Dynamic Timeline Logs Generation
    const logs: TimelineLog[] = [
        { time: '14:00', title: '任务创建', detail: 'iHR 发起自动初筛任务', type: 'default' },
        { time: '14:02', title: '简历解析完成', detail: '提取关键技能与工作经历', type: 'default' },
    ];

    if (status !== CandidateStatus.PENDING_OUTREACH) {
        logs.push({ time: '14:05', title: '触达短信已送达', detail: '发送至候选人手机，包含通话链接', type: 'default' });
    }

    if ([CandidateStatus.INTERVIEWING, CandidateStatus.ANALYZING, CandidateStatus.DELIVERED, CandidateStatus.EXCEPTION].includes(status)) {
        logs.push({ time: '14:30', title: '候选人点击链接', detail: '设备检测通过 (iOS / Safari)', type: 'default' });
        logs.push({ time: '14:31', title: '通话建立', detail: '双方已接入，AI 开始对话', type: 'default' });
    }

    if (status === CandidateStatus.EXCEPTION) {
        logs.push({ time: '14:35', title: '通话异常中断', detail: '检测到候选人主动挂断或信号丢失 (连续3次)', type: 'error' });
    }

    if ([CandidateStatus.ANALYZING, CandidateStatus.DELIVERED].includes(status)) {
        logs.push({ time: '14:45', title: '通话结束', detail: '通话时长 14分20秒', type: 'default' });
        logs.push({ time: '14:46', title: '生成分析报告中', detail: '正在进行语音转写与意图识别...', type: 'default' });
    }

    if (status === CandidateStatus.DELIVERED) {
        logs.push({ time: '14:48', title: 'AI 报告已生成', detail: '包含 3 个关键风险点提示，已发送通知', type: 'success' });
    }

    return { status, name, role, logs, avatar };
};

const OrderDetailView: React.FC<OrderDetailViewProps> = ({ candidateId, onNavigate, defaultTab = 'ANALYSIS' }) => {
  const { status, name, role, logs, avatar } = useMemo(() => getMockCandidateContext(candidateId), [candidateId]);
  
  // Local state for Decision Logic
  const [decisionState, setDecisionState] = useState<'NONE' | 'PROCESSING' | 'APPROVED' | 'REJECTED'>('NONE');
  
  // Smart default tab logic
  const smartInitialTab = (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) ? 'TIMELINE' : defaultTab;
  const [activeTab, setActiveTab] = useState<'ANALYSIS' | 'TIMELINE' | 'RECORDING' | 'RESUME'>(smartInitialTab);
  
  useEffect(() => {
     if (defaultTab === 'ANALYSIS' && status !== CandidateStatus.DELIVERED) {
         setActiveTab('TIMELINE');
     } else {
         setActiveTab(defaultTab);
     }
  }, [defaultTab, status]);

  const [activeSectionId, setActiveSectionId] = useState<string | null>(null);

  // DECISION HANDLER
  const handleDecision = (type: 'APPROVED' | 'REJECTED') => {
      setDecisionState('PROCESSING');
      // Simulate API Call
      setTimeout(() => {
          setDecisionState(type);
      }, 1500);
  };

  // Progress Bar logic
  const getCurrentStepIndex = () => {
      let index = STEPS.findIndex(s => s.id === status);
      if (status === CandidateStatus.EXCEPTION) return 2; 
      if (index === -1) return 0;
      return index;
  };
  
  const currentStepIndex = getCurrentStepIndex();
  const progressPercentage = (currentStepIndex / (STEPS.length - 1)) * 100;

  // Mock Resume Data
  const observations: Observation[] = [
    {
      id: 'o1', category: '技术深度验证', title: 'Kubernetes与Volcano调度理解',
      observation: '候选人对Volcano调度引擎工作原理描述准确，能清晰解释异构资源调度策略。',
      quote: 'Volcano是专门为AI/大数据场景设计的调度器，支持gang scheduling和queue管理，我们用它实现了GPU资源的统一纳管。',
      evidenceTime: '04:15 - 05:30', signalType: 'CONFIDENT', relatedSectionId: 'project_1'
    },
    {
      id: 'o2', category: '技术深度验证', title: '大模型分布式部署经验',
      observation: '对DeepSeek 671B模型的分布式部署细节描述具体，提及基于Ray实现多机多卡推理。',
      quote: 'DeepSeek 671B这么大的模型，单机肯定装不下。我们基于Ray做了分布式推理，通过tensor并行和pipeline并行结合。',
      evidenceTime: '06:20 - 07:45', signalType: 'CONFIDENT', relatedSectionId: 'w1_p4'
    },
    {
      id: 'o3', category: '离职动机核实', title: '关于高创安邦离职原因',
      observation: '提及公司业务调整时表达不够流畅，与简历时间线（仅工作1.5年）存在疑问。',
      quote: '嗯...主要是当时公司业务方向有些调整，然后我觉得...技术栈可能不太匹配我的发展方向。',
      evidenceTime: '12:10 - 13:15', signalType: 'HESITANT', gap: '未正面说明是否涉及裁员或团队解散。', nextQuestion: '建议背景调查时核实该段时间的离职原因，是否为公司主动裁员。', relatedSectionId: 'work_2_reason'
    },
    {
      id: 'o4', category: '项目经验核实', title: '雪亮工程数据处理规模',
      observation: '提到日均处理20TB数据，但对数据处理链路和性能优化细节描述较为模糊。',
      quote: '日均20TB...主要是通过Spark做批处理，然后...具体的调优我们有专门的团队负责。',
      evidenceTime: '08:30 - 09:20', signalType: 'VAGUE', gap: '对核心技术细节描述不够深入，可能并非亲自负责性能调优。', nextQuestion: '建议追问Spark调优具体措施，如数据倾斜处理、内存管理等。', relatedSectionId: 'project_2_scale'
    },
    {
      id: 'o5', category: '通用素质评估', title: '工作稳定性',
      observation: '过去3份工作平均时长约1.5年，频繁跳槽可能影响稳定性。',
      quote: '我觉得每个阶段都有不同的成长机会，所以会根据自己的职业规划做调整。',
      evidenceTime: '14:05 - 14:50', signalType: 'HESITANT', gap: '未明确说明每次跳槽的具体原因和未来职业规划。', nextQuestion: '建议追问未来3-5年职业规划，以及对稳定性的看法。', relatedSectionId: 'work_stability',
      competencyDimension: 'stability', competencyRating: 'concern', competencyLabel: '频繁跳槽'
    },
    {
      id: 'o6', category: '技术广度评估', title: '全栈技术能力',
      observation: '候选人展现出从大数据到AI平台、从边缘计算到云原生的广泛技术栈，学习能力较强。',
      quote: '我之前做过工业物联网的实时计算，后来转到大数据平台，现在做AI云原生，都是围绕数据和计算这条线。',
      evidenceTime: '10:15 - 11:00', signalType: 'CONFIDENT', relatedSectionId: 'work_1',
      competencyDimension: 'learning', competencyRating: 'excellent', competencyLabel: '学习力强'
    },
    {
      id: 'o7', category: '通用素质评估', title: '表达逻辑',
      observation: '整体表达清晰，能够用通俗语言解释复杂技术概念，沟通能力较好。',
      quote: '云原生AI平台其实就是把传统AI训练推理那套东西，用Kubernetes这种容器编排技术管起来，让资源调度更灵活。',
      evidenceTime: '02:30 - 03:15', signalType: 'CONFIDENT', relatedSectionId: 'header',
      competencyDimension: 'communication', competencyRating: 'excellent', competencyLabel: '流畅清晰'
    },
    {
      id: 'o8', category: '基本信息核实', title: '薪资期望合理性',
      observation: '期望29-35K，结合5年经验和技术深度，处于合理区间。候选人对薪资表述自信且有依据。',
      quote: '我目前的薪资基数加上这几年的技术积累，29-35K这个范围是比较合理的。',
      evidenceTime: '15:20 - 15:45', signalType: 'CONFIDENT', relatedSectionId: 'header',
      competencyDimension: 'motivation', competencyRating: 'fair', competencyLabel: '动机模糊'
    },
    {
      id: 'o9', category: '通用素质评估', title: '逻辑思维能力',
      observation: '回答问题时整体逻辑清晰，但在描述雪亮工程技术细节时出现模糊，可能对部分技术环节理解不够深入。',
      quote: '我们主要负责数据平台建设...具体的Spark调优是团队一起做的，我主要负责整体架构设计。',
      evidenceTime: '08:45 - 09:30', signalType: 'VAGUE', gap: '对自己负责的具体模块边界描述不够清晰。', relatedSectionId: 'project_2',
      competencyDimension: 'logic', competencyRating: 'good', competencyLabel: '基本自洽'
    },
    {
      id: 'o10', category: '通用素质评估', title: '简历真实性评估',
      observation: 'Kubernetes、Volcano等核心技能点经过验证真实可信，但雪亮工程的数据规模和个人职责细节待进一步核实。',
      quote: '日均20TB数据...我们团队大概十几个人，我主要负责平台侧的开发和管理。',
      evidenceTime: '08:30 - 09:20', signalType: 'CONFIDENT', gap: '项目规模数据待背调核实。', relatedSectionId: 'project_2',
      competencyDimension: 'integrity', competencyRating: 'good', competencyLabel: '基本可信'
    }
  ];

  // 核心发现总结
  const coreSummary = "候选人技术广度较好，从大数据到AI云原生转型清晰。Kubernetes/Volcano等核心技能已验证。但工作稳定性需关注（3份工作平均1.5年），建议二面重点追问离职动机和未来规划。";

  const resumeSections: ResumeSection[] = [
      { id: 'header', type: 'header', content: { name: '刘启迪', role: '算力平台开发工程师', contact: '13898941437 · Lqd54766209@163.com', loc: '北京 · 期望薪资29-35K · 一个月内到岗' } },
      { id: 'edu', type: 'education', content: { school: '内蒙古科技大学', degree: '软件工程 · 本科', time: '2016-08 ~ 2020-07' } },
      { id: 'work_1', type: 'work', verificationStatus: 'verified', content: {
          company: '北京亚信数据有限公司', role: 'AI平台开发工程师', time: '2023-07 ~ 至今',
          desc: [
              { text: '负责深度学习平台的推理服务核心模块设计与开发。', id: 'w1_p1', status: 'verified' },
              { text: '基于CloneSet完成单机多卡推理功能，实现高可用、弹性扩缩容、服务鉴权、灰度发布等配套功能。', id: 'w1_p2', status: 'verified' },
              { text: '设计并开发基于Ray的分布式推理功能，实现大模型的多机多卡分布式部署。', id: 'w1_p3', status: 'verified' },
              { text: '推理模块支持Nvidia及国产显卡上Llama系列、DeepSeek 671B等大模型的分布式部署。', id: 'w1_p4', status: 'verified' }
          ]
      }},
      { id: 'work_2', type: 'work', verificationStatus: 'warning', content: {
          company: '高创安邦(北京)技术有限公司', role: '数据平台开发工程师', time: '2021-12 ~ 2023-07',
          desc: [
              { text: '担任研发经理，参与东莞雪亮工程二期信创国产化适配调研及落地。', id: 'w2_p1', status: 'verified' },
              { text: '负责技术管理及核心代码开发，把控研发规范及进度。', id: 'w2_p2', status: 'verified' },
              { text: '联合数据治理人员设计数据流转规范并实施，提升数据入平台效率及数据质量。', id: 'w2_p3', status: 'verified' },
              { text: '离职原因：业务方向调整，寻求更符合个人技术发展的方向。', id: 'work_2_reason', status: 'risk' }
          ]
      }},
      { id: 'work_3', type: 'work', verificationStatus: 'neutral', content: {
          company: '北京科技大学设计研究院有限公司', role: '平台开发工程师', time: '2020-08 ~ 2021-12',
          desc: [
              { text: '担任核心开发工程师，负责设备状态实时监测系统的数据采集模块与实时计算引擎设计。', id: 'w3_p1', status: 'neutral' },
              { text: '实现多协议设备标准化接入与数据清洗逻辑。', id: 'w3_p2', status: 'neutral' },
              { text: '参与Flink流处理流程优化，提升系统处理效率与稳定性。', id: 'w3_p3', status: 'neutral' }
          ]
      }},
      { id: 'project_1', type: 'project', verificationStatus: 'verified', content: {
          name: '深度学习平台', role: '核心开发工程师', time: '2023-10 ~ 至今',
          desc: [
              { text: '算力平台为AI开发者及算力运营方构建高效协同的技术生态，提供从数据集管理、模型全生命周期管控到资源调度的一站式服务。', id: 'p1_d1', status: 'verified' },
              { text: '支持vLLM/Triton Serve/Onnx等推理框架及DeepSpeed/PyTorch分布式训练任务。', id: 'p1_d2', status: 'verified' },
              { text: '内置Llama/DeepSeek/Qwen等开源大模型实现性能优化。', id: 'p1_d3', status: 'verified' },
              { text: '通过Volcano调度引擎实现异构资源的高效分配，实现算力开发到运营的一体化平台。', id: 'project_1_responsibility_4', status: 'verified' }
          ]
      }},
      { id: 'project_2', type: 'project', verificationStatus: 'warning', content: {
          name: '东莞雪亮工程二期-综治应用数据中台', role: '研发经理', time: '2021-12 ~ 2023-05',
          desc: [
              { text: '基于雪亮工程视图数据和各委办局业务数据，构建人、地、事、物等基础资源库及特殊人员、重点事件等专题库。', id: 'p2_d1', status: 'verified' },
              { text: '日均处理超20TB数据，获评广东省数字政府信创优秀案例。', id: 'project_2_scale', status: 'risk' },
              { text: '基于中标麒麟国产操作系统，采用SpringBoot微服务架构，集成Hadoop、Hive、Spark、DataX等组件。', id: 'p2_d3', status: 'verified' },
              { text: '通过东方通中间件实现前后端国产化部署，适配达梦/人大金仓国产数据库。', id: 'p2_d4', status: 'verified' }
          ]
      }},
      { id: 'project_3', type: 'project', verificationStatus: 'neutral', content: {
          name: '设备状态实时监测系统', role: '核心开发工程师', time: '2021-02 ~ 2021-11',
          desc: [
              { text: '工业设备状态实时监测系统支持PLC、传感器等多类型设备接入，集成Modbus/OPC UA等工业协议实现数据采集与预处理。', id: 'p3_d1', status: 'neutral' },
              { text: '实时计算基于Flink(RocksDB状态后端)与Drools规则引擎。', id: 'p3_d2', status: 'neutral' },
              { text: '存储层使用InfluxDB(时序数据)+MySQL(业务数据)。', id: 'p3_d3', status: 'neutral' },
              { text: '可视化通过Three.js实现数字孪生，结合React+Spring Boot构建前后端分离平台。', id: 'p3_d4', status: 'neutral' }
          ]
      }},
      { id: 'skills', type: 'skills', content: { tags: ['Kubernetes', 'Docker', 'Volcano', 'Golang', 'Java', 'Python', 'Hadoop', 'Spark', 'Flink', 'vLLM', 'DeepSeek', 'Llama', 'MySQL', 'Redis', 'Kafka', 'Prometheus'] }}
  ];

  const transcript = [
      { speaker: 'AI', text: '您好刘启迪，这里是 iHR 智能招聘助理艾琳。请问现在方便大概花 15 分钟聊聊算力平台开发工程师这个岗位吗？', time: '00:05' },
      { speaker: 'Candidate', text: '您好，方便的，可以聊。', time: '00:12' },
      { speaker: 'AI', text: '好的。我看到您简历里提到了深度学习平台的推理服务开发，还支持DeepSeek 671B这种超大模型。能具体讲讲您是如何实现分布式推理的吗？', time: '00:18' },
      { speaker: 'Candidate', text: 'DeepSeek 671B这么大的模型，单机肯定装不下。我们基于Ray做了分布式推理，通过tensor并行和pipeline并行结合...', time: '00:35' },
      { speaker: 'AI', text: '听起来很有挑战性。那在高创安邦那段经历，您提到了日均处理20TB数据，能详细说说技术架构和您负责的部分吗？', time: '06:50' },
      { speaker: 'Candidate', text: '日均20TB...主要是通过Spark做批处理，然后...具体的调优我们有专门的团队负责。', time: '07:15', highlight: 'risk' },
      { speaker: 'AI', text: '了解。那您从高创安邦离职的原因是什么呢？', time: '12:05' },
      { speaker: 'Candidate', text: '嗯...主要是当时公司业务方向有些调整，然后我觉得...技术栈可能不太匹配我的发展方向。', time: '12:10', highlight: 'risk' },
  ];

  // Actions
  const handleSectionClick = (sectionId: string) => {
      setActiveSectionId(sectionId);
      const obsId = observations.find(o => o.relatedSectionId === sectionId || sectionId.startsWith(o.relatedSectionId || ''))?.id;
      if (obsId) document.getElementById(`obs-card-${obsId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };
  const handleObservationClick = (sectionId?: string) => {
      if (!sectionId) return;
      setActiveSectionId(sectionId);
      document.getElementById(`resume-section-${sectionId}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  };

  // --- SUB-VIEWS ---

  const RenderAnalysisTab = () => {
    const [expandedActionItems, setExpandedActionItems] = useState<Set<string>>(new Set());
    const [expandedAnnotations, setExpandedAnnotations] = useState<Set<string>>(new Set());

    const toggleActionItem = (id: string) => {
      setExpandedActionItems(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const toggleAnnotation = (id: string) => {
      setExpandedAnnotations(prev => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id); else next.add(id);
        return next;
      });
    };

    const getFollowUpQuestions = () => {
      return observations
        .filter(o => o.nextQuestion)
        .map(o => ({
          id: o.id,
          question: o.nextQuestion,
          source: o.category || '简历核验',
          reason: o.gap || o.observation,
          signalType: o.signalType,
          quote: o.quote,
          evidenceTime: o.evidenceTime,
          priority: o.title.includes('离职') || o.title.includes('稳定') ? 1 : 2
        }))
        .sort((a, b) => a.priority - b.priority);
    };

    const getAIRecommendation = () => {
      const contradictory = observations.filter(o => o.signalType === 'CONTRADICTORY').length;
      const hesitant = observations.filter(o => o.signalType === 'HESITANT').length;
      const followUps = observations.filter(o => o.nextQuestion).length;
      if (contradictory > 0) {
        return { type: 'FollowUp' as const };
      }
      if (hesitant > 1 || followUps > 3) {
        return { type: 'FollowUp' as const };
      }
      return { type: 'Proceed' as const };
    };

    const followUpQuestions = getFollowUpQuestions();

    return (
      <div className="flex-1 overflow-y-auto scroll-smooth">
        <div className="max-w-2xl mx-auto px-8 py-8 pb-32 space-y-6 animate-in slide-in-from-bottom-4 duration-500">

          {/* ═══ L1: 基础档案头 ═══ */}
          <div className="pb-2 border-b border-slate-100">
            <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 mb-2">
              <h1 className="text-2xl font-bold text-slate-900">
                {resumeSections.find(s => s.type === 'header')?.content?.name || name}
              </h1>
              <span className="text-base text-slate-500 font-medium">
                {resumeSections.find(s => s.type === 'header')?.content?.role}
              </span>
            </div>
            <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm text-slate-500">
              <span>5年经验</span>
              <span className="text-slate-300">·</span>
              <span>29-35K</span>
              <span className="text-slate-300">·</span>
              <span>1个月内到岗</span>
              {(() => {
                const edu = resumeSections.find(s => s.type === 'education');
                return edu ? (
                  <>
                    <span className="text-slate-300">·</span>
                    <span>{edu.content?.school} · {edu.content?.degree}</span>
                  </>
                ) : null;
              })()}
              <span className="text-slate-300">·</span>
              <span>📞 {resumeSections.find(s => s.type === 'header')?.content?.contact?.split('·')[0]?.trim()}</span>
            </div>
          </div>

          {/* ═══ L2: AI 核心判决 ═══ */}
          {(() => {
            const rec = getAIRecommendation();
            const cfg = {
              Proceed: { emoji: '🟢', label: '建议推进', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-800' },
              FollowUp: { emoji: '🟡', label: '建议补充追问', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-800' },
              Hold: { emoji: '🔴', label: '建议暂缓/淘汰', bg: 'bg-rose-50', border: 'border-rose-200', text: 'text-rose-800' },
            }[rec.type];
            return (
              <div className={`rounded-xl border ${cfg.border} ${cfg.bg} px-5 py-4`}>
                <div className={`text-base font-bold ${cfg.text} mb-2`}>
                  {cfg.emoji} {cfg.label}
                </div>
                <p className="text-sm text-slate-700 leading-relaxed">{coreSummary}</p>
              </div>
            );
          })()}

          {/* ═══ L3: 建议关注与追问 ═══ */}
          {followUpQuestions.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
              <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                <AlertTriangle size={13} className="text-amber-500" />
                <span className="text-xs font-bold text-slate-600 uppercase tracking-wide">
                  建议关注与追问（{followUpQuestions.length} 项）
                </span>
              </div>
              <div className="divide-y divide-slate-100">
                {followUpQuestions.map((q) => {
                  const isEvidenceOpen = expandedActionItems.has(q.id);
                  const isContradictory = q.signalType === 'CONTRADICTORY';
                  return (
                    <div key={q.id} className="px-5 py-4">
                      <div className={`text-xs font-medium mb-2 flex items-start gap-1.5 ${isContradictory ? 'text-rose-600' : 'text-amber-600'}`}>
                        <span className="shrink-0 mt-0.5">{isContradictory ? '🚨' : '⚠️'}</span>
                        <span>{q.reason}</span>
                      </div>
                      <div className="ml-5 flex items-start gap-2 mb-3">
                        <span className="text-slate-300 shrink-0 mt-0.5">→</span>
                        <p className="text-sm text-slate-800">
                          <span className="font-bold text-indigo-600 mr-1">❓ 推荐追问：</span>
                          {q.question}
                        </p>
                      </div>
                      {(q.quote || q.evidenceTime) && (
                        <div className="ml-5">
                          <button
                            onClick={() => toggleActionItem(q.id)}
                            className="flex items-center gap-1 text-xs text-slate-400 hover:text-slate-600 transition-colors"
                          >
                            <span>查看原声证据</span>
                            <ChevronDown size={11} className={`transition-transform ${isEvidenceOpen ? 'rotate-180' : ''}`} />
                          </button>
                          {isEvidenceOpen && (
                            <div className="mt-2 bg-slate-50 rounded-lg p-3 border border-slate-100 space-y-2">
                              {q.evidenceTime && (
                                <button className="flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-full text-xs font-bold hover:bg-indigo-100 transition-colors">
                                  <Play size={9} fill="currentColor" />
                                  听原声 {q.evidenceTime}
                                </button>
                              )}
                              {q.quote && (
                                <p className="text-[11px] text-slate-500 leading-relaxed">
                                  <span className="font-bold text-slate-400">候选人：</span>
                                  {q.quote}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* ═══ L4: 批注式简历正文 ═══ */}
          <div className="space-y-4">
            {(() => {
              const order: Record<string, number> = { work: 0, project: 1, education: 2, skills: 3 };
              return resumeSections
                .filter(s => s.type !== 'header')
                .sort((a, b) => (order[a.type] ?? 4) - (order[b.type] ?? 4))
                .map((s) => {
                  const isSectionActive = activeSectionId && (activeSectionId === s.id || activeSectionId.startsWith(s.id));
                  return (
                    <div
                      key={s.id}
                      id={`resume-section-${s.id}`}
                      onClick={() => handleSectionClick(s.id)}
                      className={`rounded-xl border-2 transition-all duration-300 bg-white p-5 cursor-pointer ${
                        isSectionActive ? 'border-indigo-200 shadow-sm' : 'border-slate-100 hover:border-slate-200'
                      }`}
                    >
                      <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                        {s.type === 'work' && '工作经历'}
                        {s.type === 'project' && '项目经验'}
                        {s.type === 'education' && '教育背景'}
                        {s.type === 'skills' && '技能清单'}
                      </div>

                      {(s.type === 'work' || s.type === 'project') && (
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{s.content.company || s.content.name}</h3>
                            <div className="text-sm text-indigo-600 font-medium mt-0.5">{s.content.role}</div>
                          </div>
                          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded whitespace-nowrap ml-4">{s.content.time}</span>
                        </div>
                      )}

                      {s.type === 'education' && (
                        <div className="flex justify-between items-start">
                          <div>
                            <h3 className="text-base font-bold text-slate-900">{s.content?.school}</h3>
                            <div className="text-sm text-slate-600 mt-0.5">{s.content?.degree}</div>
                          </div>
                          <span className="text-xs font-mono text-slate-400 bg-slate-50 px-2 py-0.5 rounded whitespace-nowrap ml-4">{s.content?.time}</span>
                        </div>
                      )}

                      {(s.type === 'work' || s.type === 'project') && s.content.desc && (
                        <ul className="space-y-3" onClick={(e) => e.stopPropagation()}>
                          {s.content.desc.map((line: any) => {
                            const linkedObs = observations.find(o => o.relatedSectionId === line.id);
                            const isAnnotationOpen = linkedObs ? expandedAnnotations.has(linkedObs.id) : false;
                            return (
                              <li key={line.id} id={`resume-section-${line.id}`}>
                                <div className="flex items-start gap-2">
                                  <span className="mt-[7px] w-1.5 h-1.5 rounded-full bg-slate-300 shrink-0"></span>
                                  <div className="flex-1 min-w-0">
                                    <span className="text-sm leading-relaxed text-slate-700">{line.text}</span>
                                    {linkedObs && (
                                      <button
                                        onClick={() => toggleAnnotation(linkedObs.id)}
                                        className={`inline-flex items-center gap-0.5 ml-2 text-[10px] font-bold px-1.5 py-0.5 rounded border align-middle transition-all ${
                                          linkedObs.signalType === 'CONFIDENT'
                                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                            : linkedObs.signalType === 'CONTRADICTORY'
                                            ? 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-100'
                                            : 'bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100'
                                        }`}
                                      >
                                        {linkedObs.signalType === 'CONFIDENT' && '✅ 已验证'}
                                        {linkedObs.signalType === 'HESITANT' && '⚠️ 存疑'}
                                        {linkedObs.signalType === 'VAGUE' && '⚠️ 逻辑存疑'}
                                        {linkedObs.signalType === 'CONTRADICTORY' && '🚨 矛盾点'}
                                        <ChevronDown size={9} className={`transition-transform ${isAnnotationOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                    )}
                                  </div>
                                </div>
                                {isAnnotationOpen && linkedObs && (
                                  <div className="mt-2 ml-3.5">
                                    <RedPenCard data={linkedObs} />
                                  </div>
                                )}
                              </li>
                            );
                          })}
                        </ul>
                      )}

                      {s.type === 'skills' && (
                        <div className="flex flex-wrap gap-2" onClick={(e) => e.stopPropagation()}>
                          {s.content.tags.map((tag: string) => (
                            <span key={tag} className="px-3 py-1 text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg">{tag}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                });
            })()}
          </div>

        </div>
      </div>
    );
  };

  const RenderTimelineTab = () => (
      <div className="flex-1 overflow-y-auto p-8 bg-transparent relative z-10">
          <div className="max-w-3xl mx-auto">
             <div className="bg-white/80 backdrop-blur-md rounded-xl border border-white/60 shadow-glass overflow-hidden mb-8">
                 <div className="p-8">
                    {/* --- DYNAMIC PROGRESS BAR --- */}
                    <div className="relative flex justify-between mb-12">
                      <div className="absolute top-5 left-0 w-full h-0.5 bg-slate-100 -z-10"></div>
                      <div 
                        className={`absolute top-5 left-0 h-0.5 -z-10 transition-all duration-700 ease-out ${status === CandidateStatus.EXCEPTION ? 'bg-rose-500' : 'bg-indigo-600'}`} 
                        style={{ width: `${progressPercentage}%` }}
                      ></div>
                      
                      {STEPS.map((step, idx) => {
                          const isCompleted = idx <= currentStepIndex; 
                          const isCurrent = idx === currentStepIndex;
                          
                          let circleClass = "bg-white border-slate-200 text-slate-300";
                          let labelClass = "text-slate-400";
                          let icon = <step.icon size={18} />;

                          if (status === CandidateStatus.EXCEPTION && isCurrent) {
                              circleClass = "bg-rose-600 border-rose-600 text-white ring-4 ring-rose-100";
                              labelClass = "text-rose-600 font-bold";
                              icon = <AlertTriangle size={18} />;
                          } else if (isCurrent) {
                              circleClass = "bg-indigo-600 border-indigo-600 text-white ring-4 ring-indigo-100";
                              if (step.id === CandidateStatus.INTERVIEWING || step.id === CandidateStatus.ANALYZING) circleClass += " animate-pulse";
                              labelClass = "text-indigo-600 font-bold";
                          } else if (isCompleted) {
                              circleClass = "bg-indigo-600 border-indigo-600 text-white";
                              labelClass = "text-indigo-600 font-medium";
                          }

                          return (
                              <div key={step.id} className="flex flex-col items-center gap-3 relative">
                                  <div className={`w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all duration-300 z-10 ${circleClass}`}>
                                      {icon}
                                  </div>
                                  <span className={`text-xs font-medium ${labelClass}`}>{step.label}</span>
                              </div>
                          )
                      })}
                    </div>

                    {/* --- TIMELINE LOGS --- */}
                    <div className="relative pl-4 border-l-2 border-slate-100 space-y-8">
                        {logs.map((log, index) => (
                            <div key={index} className="relative group">
                                <div className={`absolute -left-[23px] top-1 w-3 h-3 rounded-full border-2 bg-white ${log.type === 'error' ? 'border-rose-500' : log.type === 'success' ? 'border-emerald-500' : 'border-indigo-500'} group-hover:scale-125 transition-transform`}></div>
                                <div className="flex flex-col sm:flex-row sm:items-baseline gap-1 sm:gap-4">
                                    <span className="text-[13px] font-mono font-bold text-slate-400 w-12 shrink-0">{log.time}</span>
                                    <div>
                                        <h4 className={`text-sm font-bold ${log.type === 'error' ? 'text-rose-600' : log.type === 'success' ? 'text-emerald-600' : 'text-slate-900'}`}>{log.title}</h4>
                                        <p className="text-xs text-slate-500 mt-1">{log.detail}</p>
                                    </div>
                                </div>
                            </div>
                        ))}

                         {/* EXCEPTION INTERVENTION CONSOLE */}
                         {status === CandidateStatus.EXCEPTION && (
                             <div className="mt-8 bg-rose-50 border border-rose-100 rounded-xl p-5 relative animate-in slide-in-from-bottom-2">
                                  <div className="absolute -left-[23px] top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-rose-200 animate-pulse"></div>
                                  
                                  <div className="flex items-start gap-4 mb-4">
                                      <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center text-rose-500 shadow-sm border border-rose-100 shrink-0">
                                          <AlertTriangle size={20} />
                                      </div>
                                      <div>
                                          <h4 className="font-bold text-slate-900 text-sm">任务异常：需要人工干预</h4>
                                          <p className="text-xs text-rose-700 mt-1">AI 呼叫已中断，建议通过以下方式联系候选人。</p>
                                      </div>
                                  </div>
                                  
                                  <div className="flex flex-wrap gap-3">
                                      <button className="flex items-center gap-2 px-4 py-2 bg-white border border-rose-200 rounded-lg text-[13px] font-bold text-slate-700 hover:text-rose-600 hover:border-rose-300 transition-all shadow-sm">
                                          <Link size={14} /> 复制面试邀请链接
                                      </button>
                                      <button className="flex items-center gap-2 px-4 py-2 bg-rose-600 text-white rounded-lg text-[13px] font-bold hover:bg-rose-700 shadow-md shadow-rose-200 transition-all">
                                          <PhoneForwarded size={14} /> 人工拨号并标记
                                      </button>
                                      <button className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-500 rounded-lg text-[13px] font-bold hover:bg-slate-200 transition-all">
                                          <RotateCcw size={14} /> 重置 AI 任务
                                      </button>
                                  </div>
                             </div>
                         )}
                         
                         {/* Next Step Prediction (Fake) */}
                         {status !== CandidateStatus.DELIVERED && status !== CandidateStatus.EXCEPTION && (
                            <div className="relative">
                                <div className="absolute -left-[23px] top-1 w-3 h-3 rounded-full bg-slate-200 animate-pulse"></div>
                                <span className="text-xs text-slate-400 italic pl-1">iHR 正在执行下一步操作...</span>
                            </div>
                         )}
                    </div>
                 </div>
             </div>
          </div>
      </div>
  );

  const RenderRecordingTab = () => (
      <div className="flex-1 flex overflow-hidden bg-white/70 backdrop-blur-md relative z-10">
          <div className="w-[60%] flex flex-col border-r border-white/50">
             <div className="px-6 py-4 border-b border-white/50 flex justify-between items-center">
                 <h3 className="font-bold text-slate-800 text-[13px]">全文转写 (Transcript)</h3>
                 <button className="text-[13px] text-indigo-600 font-bold flex items-center gap-1"><Download size={12}/> 导出文本</button>
             </div>
             <div className="flex-1 overflow-y-auto p-6 space-y-6">
                 {transcript.map((t, idx) => (
                     <div key={idx} className="flex gap-4 group">
                         <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${t.speaker === 'AI' ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-600'}`}>
                             {t.speaker === 'AI' ? (
                                 <img src={EILEEN_AVATAR} className="w-full h-full object-cover rounded-full" />
                             ) : '候选人'}
                         </div>
                         <div className="flex-1">
                             <div className="flex items-center gap-2 mb-1">
                                 <span className="text-xs font-bold text-slate-700">{t.speaker === 'AI' ? '招聘助理艾琳' : name}</span>
                                 <span className="text-[10px] text-slate-400 font-mono">{t.time}</span>
                             </div>
                             <p className={`text-sm leading-relaxed p-2 rounded-lg ${t.highlight === 'risk' ? 'bg-amber-50 text-slate-800 border border-amber-100' : 'text-slate-600 hover:bg-white/50'}`}>
                                 {t.text}
                             </p>
                         </div>
                     </div>
                 ))}
             </div>
          </div>

          <div className="w-[40%] bg-transparent flex flex-col">
              <div className="p-6 border-b border-white/50">
                  <div className="bg-white/80 rounded-xl border border-white/60 p-4 shadow-glass">
                       <div className="flex items-center justify-between mb-4">
                           <span className="text-xs font-bold text-slate-500">录音播放</span>
                           <span className="text-xs font-mono text-slate-400">14:20</span>
                       </div>
                       <div className="h-12 flex items-center gap-0.5 justify-center mb-4 overflow-hidden opacity-60">
                            {[...Array(40)].map((_, i) => (
                                <div key={i} className="w-1 bg-indigo-500 rounded-full" style={{ height: `${Math.random() * 100}%` }}></div>
                            ))}
                       </div>
                       <div className="flex justify-center gap-4">
                           <button className="p-3 bg-indigo-600 rounded-full text-white shadow-lg hover:bg-indigo-700"><Play size={20} fill="currentColor" /></button>
                       </div>
                  </div>
              </div>
          </div>
      </div>
  );


  // --- MAIN RENDER ---
  return (
    // Changed: Transparent main container
    <div className="h-full w-full bg-transparent flex flex-col relative overflow-hidden font-sans">
      
      {/* NEW: Ambient Gradient Blob */}
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-gradient-to-tr from-indigo-200/30 via-rose-200/20 to-transparent blur-[120px] pointer-events-none z-0"></div>

      {/* 1. PERSISTENT HEADER (FIXED OVERFLOW & FLEX LAYOUT) */}
      <div className="bg-white/70 backdrop-blur-md border-b border-white/50 px-6 pt-5 pb-0 shrink-0 z-30 sticky top-0 flex flex-col gap-5 shadow-sm">
        
        {/* TOAST FEEDBACK OVERLAY */}
        {decisionState === 'APPROVED' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                <CheckCircle2 className="text-emerald-400" size={20} />
                <div>
                    <div className="font-bold text-sm">已通过初筛</div>
                    <div className="text-xs text-slate-300">艾琳已自动发送面试邀请邮件。</div>
                </div>
            </div>
        )}
        {decisionState === 'REJECTED' && (
            <div className="absolute top-20 left-1/2 -translate-x-1/2 bg-slate-900/90 text-white px-6 py-3 rounded-xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-top-4 fade-in z-50">
                <XCircle className="text-rose-400" size={20} />
                <div>
                    <div className="font-bold text-sm">已标记淘汰</div>
                    <div className="text-xs text-slate-300">订单已归档至历史库。</div>
                </div>
            </div>
        )}

        {/* Top Row: Info & Global Actions */}
        <div className="flex items-center justify-between">
            {/* Left Side: Candidate Info */}
            <div className="flex items-center gap-5 flex-1 min-w-0 mr-4">
                <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="w-8 h-8 flex items-center justify-center hover:bg-white/50 rounded-lg text-slate-500 transition-colors shrink-0">
                    <ChevronLeft size={22} />
                </button>
                <div className="flex items-center gap-4 min-w-0">
                    <img src={avatar} alt={name} className="w-12 h-12 rounded-full object-cover ring-2 ring-white shadow-md shrink-0" />
                    <div className="min-w-0">
                        <div className="flex items-center gap-3">
                            {/* UPDATED: text-lg instead of text-xl/2xl */}
                            <h2 className="text-lg font-bold text-slate-900 leading-tight truncate">{name}</h2>
                            {/* Status Badge - Updated text-xs */}
                            <span className={`px-2.5 py-0.5 text-xs font-bold rounded-full border flex items-center gap-1.5 cursor-pointer hover:opacity-80 shrink-0 shadow-sm
                                ${decisionState !== 'NONE' ? 'bg-slate-100 text-slate-500 border-slate-200' : 
                                  status === CandidateStatus.DELIVERED ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 
                                  status === CandidateStatus.EXCEPTION ? 'bg-rose-50 text-rose-700 border-rose-100' :
                                  'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                                {decisionState === 'APPROVED' ? <><CheckCircle2 size={12}/> 已通过</> : 
                                 decisionState === 'REJECTED' ? <><XCircle size={12}/> 已淘汰</> :
                                 status === CandidateStatus.DELIVERED ? <><CheckCircle2 size={12}/> 已交付</> :
                                 status === CandidateStatus.INVITED ? <><Mail size={12}/> 已邀请</> :
                                 status === CandidateStatus.INTERVIEWING ? <><Phone size={12}/> 面试中</> :
                                 status === CandidateStatus.ANALYZING ? <><RefreshCw size={12} className="animate-spin"/> 分析中</> :
                                 status === CandidateStatus.PENDING_OUTREACH ? <><Clock size={12}/> 待触达</> :
                                 <><AlertTriangle size={12}/> 异常</>}
                            </span>
                        </div>
                        <p className="text-xs text-slate-500 mt-1 flex items-center gap-2 truncate font-medium">
                            {role} <span className="w-1 h-1 rounded-full bg-slate-300"></span> <span className="font-mono text-slate-400">ID: {candidateId}</span>
                        </p>
                    </div>
                </div>
            </div>

            {/* Right Side: Actions - Decision Buttons */}
            <div className="flex items-center gap-2 shrink-0">
                {decisionState === 'NONE' && (
                    <>
                        <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-white/50 rounded-lg transition-colors" title="更多操作">
                            <MoreHorizontal size={20} />
                        </button>
                        <div className="h-6 w-px bg-slate-200 mx-2"></div>
                        <button 
                            onClick={() => handleDecision('REJECTED')} 
                            className="flex items-center gap-2 px-4 py-2 bg-white/60 border border-rose-200 text-rose-600 text-[13px] font-bold rounded-lg hover:bg-rose-50 transition-all whitespace-nowrap"
                        >
                            <XCircle size={14} /> 淘汰
                        </button>
                        <button 
                            onClick={() => handleDecision('APPROVED')} 
                            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white text-[13px] font-bold rounded-lg hover:bg-indigo-600 shadow-md shadow-slate-300 transition-all whitespace-nowrap"
                        >
                            <UserCheck size={14} /> 通过
                        </button>
                    </>
                )}
                {decisionState === 'PROCESSING' && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-lg">
                        <Loader2 size={14} className="animate-spin text-slate-500"/>
                        <span className="text-[13px] font-bold text-slate-500">处理中...</span>
                    </div>
                )}
                {decisionState !== 'NONE' && decisionState !== 'PROCESSING' && (
                    <button onClick={() => onNavigate(ViewState.DASHBOARD)} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 text-[13px] font-bold rounded-lg hover:bg-slate-200 transition-all">
                        返回工作台
                    </button>
                )}
            </div>
        </div>

        {/* Bottom Row: UPDATED PILL TABS */}
        <div className="flex justify-between items-center pb-3">
             <div className="flex p-1 bg-slate-100/60 rounded-full border border-white/40 backdrop-blur-sm">
                {[
                    { id: 'ANALYSIS', label: '智能分析', icon: CheckCircle2, disabled: status !== CandidateStatus.DELIVERED },
                    { id: 'TIMELINE', label: '任务进度', icon: Clock, disabled: false },
                    { id: 'RESUME', label: '原始简历', icon: FileText, disabled: false },
                    { id: 'RECORDING', label: '通话录音', icon: Mic2, disabled: [CandidateStatus.PENDING_OUTREACH, CandidateStatus.INVITED].includes(status) }
                ].map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => !tab.disabled && setActiveTab(tab.id as any)}
                        disabled={tab.disabled as boolean}
                        className={`px-4 py-1.5 text-[13px] font-bold rounded-full flex items-center gap-2 transition-all whitespace-nowrap relative
                            ${activeTab === tab.id 
                                ? 'bg-white text-indigo-600 shadow-sm ring-1 ring-black/5' 
                                : tab.disabled 
                                    ? 'text-slate-300 cursor-not-allowed' 
                                    : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'}`}
                    >
                        <tab.icon size={14} />
                        {tab.label}
                        {tab.id === 'RECORDING' && activeTab !== 'RECORDING' && !tab.disabled && (
                            <span className="w-1.5 h-1.5 rounded-full bg-rose-500 absolute top-2 right-2"></span>
                        )}
                    </button>
                ))}
            </div>
            {/* Optional: Tab Contextual Action/Info could go here */}
        </div>
      </div>

      {/* 2. MAIN CONTENT AREA */}
      {activeTab === 'ANALYSIS' && <RenderAnalysisTab />}
      {activeTab === 'TIMELINE' && <RenderTimelineTab />}
      {activeTab === 'RECORDING' && <RenderRecordingTab />}
      {activeTab === 'RESUME' && (
           <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-white/40 relative z-10">
               <div className="bg-white/80 backdrop-blur-md shadow-lg p-12 min-h-[800px] w-[800px]">
                   <div className="border-b pb-6 mb-6">
                       <h1 className="text-2xl font-bold text-slate-900">{name}</h1>
                       <p className="text-slate-500 mt-2">{role} · 北京</p>
                   </div>
                   <div className="space-y-6">
                       <p className="text-slate-400 italic text-center text-sm">-- 原始 PDF 预览区域 --</p>
                       <p className="text-slate-600 leading-8 text-sm">此处展示解析前的原始简历文件，方便 HR 核对细节...</p>
                   </div>
               </div>
           </div>
      )}

    </div>
  );
};

export default OrderDetailView;