import React from 'react';
import { ViewState } from '../../shared/types';

interface InitiationViewProps {
    onNavigate: (view: ViewState) => void;
}

const InitiationView: React.FC<InitiationViewProps> = ({ onNavigate }) => {
    // This component now simulates a "PDF Viewer" or "LinkedIn Profile"
    // It acts as the context for the agent.

    return (
        <div className="h-full w-full overflow-y-auto bg-slate-50 relative">
            {/* Fake PDF Toolbar */}
            <div className="sticky top-0 h-10 bg-slate-700 text-white flex items-center justify-between px-4 z-10 shadow-md">
                <div className="text-xs font-medium">zhangsan_resume_2024.pdf</div>
                <div className="flex gap-4 text-xs opacity-80">
                    <span>1 / 2</span>
                    <span>100%</span>
                </div>
            </div>

            {/* Fake Resume Content - Simply simulated with an image or structured HTML */}
            <div className="max-w-[800px] mx-auto my-8 bg-white shadow-xl min-h-[1000px] p-12 text-slate-800">
                {/* Header */}
                <div className="border-b pb-6 mb-8">
                    <h1 className="text-3xl font-bold mb-2">赵嘉明 (Zhang San)</h1>
                    <p className="text-slate-500 font-medium">高级前端工程师 (Senior Frontend Engineer)</p>
                    <div className="flex gap-4 mt-4 text-sm text-slate-600">
                        <span>138-0000-0000</span>
                        <span>zhangsan@email.com</span>
                        <span>北京 · 望京</span>
                    </div>
                </div>

                {/* Sections */}
                <div className="space-y-8">
                    <section>
                        <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-4">个人简介</h2>
                        <p className="text-sm leading-relaxed text-slate-600">
                            5年前端开发经验，专注于 React 生态系统与大型 Web 应用架构。擅长性能优化、工程化建设及微前端落地。
                        </p>
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-4">工作经历</h2>

                        <div className="mb-6">
                            <div className="flex justify-between mb-1">
                                <h3 className="font-bold">北京字节跳动科技有限公司</h3>
                                <span className="text-sm text-slate-500">2021.03 - 至今</span>
                            </div>
                            <div className="text-sm text-indigo-600 font-bold mb-2">资深前端开发工程师</div>
                            <ul className="list-disc pl-4 text-sm space-y-1.5 text-slate-700">
                                <li>负责核心业务中台建设，支撑日均千万级 PV 访问。</li>
                                <li>主导 React 16 到 18 的架构升级，First Contentful Paint (FCP) 提升 40%。</li>
                                <li>离职原因：寻求更大的技术挑战及业务发展空间。</li>
                            </ul>
                        </div>

                        <div>
                            <div className="flex justify-between mb-1">
                                <h3 className="font-bold">美团点评</h3>
                                <span className="text-sm text-slate-500">2019.07 - 2021.02</span>
                            </div>
                            <div className="text-sm text-indigo-600 font-bold mb-2">前端开发工程师</div>
                            <ul className="list-disc pl-4 text-sm space-y-1.5 text-slate-700">
                                <li>参与外卖商家端 CRM 系统重构。</li>
                                <li>基于 Vue 2.0 + ElementUI 开发通用组件库。</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h2 className="text-sm font-bold text-indigo-800 uppercase tracking-widest border-b border-indigo-100 pb-2 mb-4">教育背景</h2>
                        <div className="flex justify-between">
                            <div>
                                <h3 className="font-bold">北京邮电大学</h3>
                                <p className="text-sm text-slate-600">计算机科学与技术 · 本科</p>
                            </div>
                            <span className="text-sm text-slate-500">2015 - 2019</span>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
};

export default InitiationView;